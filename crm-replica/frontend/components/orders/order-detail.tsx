'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Download, ExternalLink, PackagePlus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { EventLog, OrderHistory, OrderMaterial, ServiceOrder, User } from '@/types/domain';
import { EventsApi, OrdersApi } from '@/lib/api/endpoints';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { SlaBadge } from '@/components/common/sla-badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { getSocket } from '@/lib/api/socket';
import { RelativeTime } from '@/components/common/relative-time';
import { ActivityTimeline } from '@/components/timeline/activity-timeline';
import { FileUploader } from '@/modules/documents/components/file-uploader';
import { FileList } from '@/modules/documents/components/file-list';
import { useDocumentsState } from '@/modules/documents/hooks/use-documents-state';
import { resolveActorName, resolveActorNameById } from '@/lib/actor-name';
import { ORDER_STATUS_LABEL, ORDER_STATUS_WORKFLOW } from '@/constants/orderStatus';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { getOrderHistoryFieldLabel } from '@/lib/order-history';
import { Input } from '@/components/ui/input';

type LocalComment = { id: string; user: string; message: string; time: string };
type CommentForm = { comment: string };
type MaterialForm = { name: string; quantity: number; unit_cost: number };

const DEFAULT_MATERIAL: MaterialForm = { name: '', quantity: 1, unit_cost: 0 };

function buildDownloadUrl(blob: Blob) {
  return window.URL.createObjectURL(blob);
}

function materialTotal(materials: OrderMaterial[]) {
  return materials.reduce((sum, material) => sum + (material.quantity * material.unit_cost), 0);
}

export function OrderDetail({ order, users, onClose, onRefresh }: { order: ServiceOrder | null; users: User[]; onClose: () => void; onRefresh: () => void }) {
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [backendEvents, setBackendEvents] = useState<EventLog[]>([]);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [initialTechnicians, setInitialTechnicians] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [materials, setMaterials] = useState<OrderMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<OrderMaterial | null>(null);
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<CommentForm>({ defaultValues: { comment: '' } });
  const materialForm = useForm<MaterialForm>({ defaultValues: DEFAULT_MATERIAL });
  const { docs, add: addDocument, remove: removeDocument } = useDocumentsState('order', order?.id ?? '');

  useEffect(() => {
    if (!order) return;
    OrdersApi.history(order.id).then(setHistory).catch(() => setHistory([]));
    EventsApi.list({ entityType: 'order', entityId: order.id, limit: 200 }).then(setBackendEvents).catch(() => setBackendEvents([]));
    setMaterialsLoading(true);
    OrdersApi.materials(order.id)
      .then(setMaterials)
      .catch(() => setMaterials([]))
      .finally(() => setMaterialsLoading(false));
    const ids = (order.technicians ?? []).map((t) => t.technician_id);
    setSelectedTechnicians(ids);
    setInitialTechnicians(ids);
    reset({ comment: '' });
    materialForm.reset(DEFAULT_MATERIAL);
    setEditingMaterial(null);
    setMaterialModalOpen(false);
  }, [order, reset, materialForm]);

  useEffect(() => {
    const socket = getSocket();
    const onRemoteComment = (payload: { orderId: string; message: string; user: string }) => {
      if (!order || payload.orderId !== order.id) return;
      setComments((prev) => [...prev, { id: crypto.randomUUID(), user: payload.user, message: payload.message, time: new Date().toISOString() }]);
    };
    socket.on('orders:comment', onRemoteComment);
    return () => { socket.off('orders:comment', onRemoteComment); };
  }, [order]);

  const adminAllowed = useMemo(() => (order ? ORDER_STATUS_WORKFLOW[order.estado] ?? [] : []), [order]);
  const techUsers = users.filter((u) => u.role === 'tecnico');
  const usersById = useMemo(() => new Map(users.map((listedUser) => [listedUser.id, listedUser])), [users]);
  const timelineEvents = history.map((h) => ({ id: h.id, actor: resolveActorName(h.usuario), action: `cambió ${getOrderHistoryFieldLabel(h.campo_modificado)}`, entity: `${h.valor_nuevo ?? '-'}`, at: h.created_at }));
  const backendTimelineEvents = backendEvents.map((event) => ({
    id: event.id,
    actor: resolveActorNameById(event.actor_user_id, usersById),
    action: event.event_type.replace('_', ' '),
    entity: event.message,
    at: event.created_at,
    href: event.entity_type === 'order' && event.entity_id ? `/orders/${event.entity_id}` : undefined
  }));

  if (!order) return null;

  const techName = (id: string) => {
    const tech = users.find((u) => u.id === id);
    return tech ? `${tech.first_name} ${tech.last_name}` : id;
  };

  const canTechMove = user?.role === 'tecnico' && (order.estado === 'service_programado' || order.estado === 'en_ejecucion');
  const canCancel = order.estado !== 'completado' && order.estado !== 'cancelado';
  const canManageMaterials = user?.role === 'admin' || user?.role === 'tecnico';
  const reassignmentDirty = [...selectedTechnicians].sort().join(',') !== [...initialTechnicians].sort().join(',');
  const recentHistory = history.slice(0, 5);
  const materialsCost = materialTotal(materials);
  const closureChecklist = order.checklist_cierre ? Object.entries(order.checklist_cierre) : [];

  const requestClose = () => {
    if (isDirty || reassignmentDirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };

  const handleExportPdf = async () => {
    try {
      const blob = await OrdersApi.exportPdf(order.id);
      const url = buildDownloadUrl(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `service-order-${order.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ type: 'success', message: 'PDF descargado correctamente' });
    } catch {
      toast({ type: 'error', message: 'No se pudo exportar el PDF' });
    }
  };

  const openNewMaterialModal = () => {
    setEditingMaterial(null);
    materialForm.reset(DEFAULT_MATERIAL);
    setMaterialModalOpen(true);
  };

  const openEditMaterialModal = (material: OrderMaterial) => {
    setEditingMaterial(material);
    materialForm.reset({ name: material.name, quantity: material.quantity, unit_cost: material.unit_cost });
    setMaterialModalOpen(true);
  };

  const saveMaterial = materialForm.handleSubmit(async (values) => {
    if (!order) return;
    setMaterialSaving(true);
    try {
      if (editingMaterial) {
        const updated = await OrdersApi.updateMaterial(order.id, editingMaterial.id, values);
        setMaterials((prev) => prev.map((material) => material.id === updated.id ? updated : material));
        toast({ type: 'success', message: 'Material actualizado' });
      } else {
        const created = await OrdersApi.addMaterial(order.id, values);
        setMaterials((prev) => [created, ...prev]);
        toast({ type: 'success', message: 'Material agregado' });
      }
      setMaterialModalOpen(false);
      setEditingMaterial(null);
      materialForm.reset(DEFAULT_MATERIAL);
      onRefresh();
    } catch {
      toast({ type: 'error', message: 'No se pudo guardar el material' });
    } finally {
      setMaterialSaving(false);
    }
  });

  const deleteMaterial = async (material: OrderMaterial) => {
    try {
      await OrdersApi.removeMaterial(order.id, material.id);
      setMaterials((prev) => prev.filter((item) => item.id !== material.id));
      toast({ type: 'info', message: 'Material eliminado' });
      onRefresh();
    } catch {
      toast({ type: 'error', message: 'No se pudo eliminar el material' });
    }
  };

  return (
    <ErrorBoundary>
      <>
        <Drawer open={!!order} title={`Orden #${order.id.slice(0, 8)}`} onClose={requestClose}>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge value={order.estado} />
                <PriorityBadge value={order.prioridad} />
                <SlaBadge status={order.sla_status} slaDeadline={order.sla_deadline} />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={handleExportPdf}><Download size={16} /> PDF</Button>
                <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-sm text-cyan-300">
                  <ExternalLink size={14} /> Abrir página
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[var(--text-secondary)]">Cliente</p>
                <p>{order.client?.nombre_empresa ?? order.client_id}</p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Dirección</p>
                <p>{order.direccion_service ?? '-'}</p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Fecha</p>
                <p><RelativeTime value={order.fecha_programada} /></p>
              </div>
              <div>
                <p className="text-[var(--text-secondary)]">Técnicos</p>
                <div className="space-y-1">{(order.technicians ?? []).map((t) => <div key={t.technician_id} className="flex items-center gap-2"><Avatar name={techName(t.technician_id)} /><span>{techName(t.technician_id)}</span></div>)}</div>{user?.role === 'admin' ? <Button className="mt-2" variant="secondary" onClick={() => setReassignOpen(true)}>Reasignar técnicos</Button> : null}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[10px] border border-[var(--border)] p-3 text-sm">
                <p className="text-[var(--text-secondary)]">Cierre de servicio</p>
                <div className="mt-2 space-y-1">
                  <p><span className="font-medium">Horas trabajadas:</span> {order.tiempo_trabajado_horas ?? '-'}</p>
                  <p><span className="font-medium">Firma cliente:</span> {order.firma_cliente || '-'}</p>
                  <p><span className="font-medium">Foto trabajo:</span> {order.foto_trabajo_url ? <a href={order.foto_trabajo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Ver foto</a> : '-'}</p>
                  <p><span className="font-medium">Observaciones cierre:</span> {order.observaciones_cierre || '-'}</p>
                </div>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] p-3 text-sm">
                <p className="text-[var(--text-secondary)]">Checklist de cierre</p>
                <div className="mt-2 space-y-1">
                  {closureChecklist.length === 0 ? <p className="text-[var(--text-muted)]">Sin checklist registrado.</p> : closureChecklist.map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2 rounded-md bg-[var(--bg-surface-hover)] px-2 py-1">
                      <span>{key.replace(/_/g, ' ')}</span>
                      <span className={value ? 'text-emerald-600' : 'text-amber-600'}>{value ? 'Sí' : 'No'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--text-secondary)]">Acciones de workflow</p>
              <div className="flex flex-wrap gap-2">
                {user?.role === 'admin' ? adminAllowed.map((next) => <Button key={next} variant="secondary" onClick={async () => { try { await OrdersApi.patch(order.id, { estado: next }); toast({ type: 'success', message: `Estado actualizado a ${next}` }); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo actualizar el estado' }); } }}>{ORDER_STATUS_LABEL[next as keyof typeof ORDER_STATUS_LABEL] ?? next}</Button>) : null}
                {canTechMove ? <Button variant="secondary" onClick={async () => { const next = order.estado === 'service_programado' ? 'en_ejecucion' : 'completado'; try { await OrdersApi.patch(order.id, { estado: next }); toast({ type: 'success', message: `Orden ${next}` }); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo actualizar la orden' }); } }}>{ORDER_STATUS_LABEL[order.estado === 'service_programado' ? 'en_ejecucion' : 'completado']}</Button> : null}
                {canCancel ? <Button variant="danger" onClick={() => setConfirmCancel(true)}>{ORDER_STATUS_LABEL.cancelado}</Button> : null}
              </div>
            </div>

            <div className="rounded-[10px] border border-[var(--border)] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Materiales</p>
                  <p className="text-sm font-medium">{materials.length} items · ${materialsCost.toFixed(2)}</p>
                </div>
                {canManageMaterials ? <Button variant="secondary" onClick={openNewMaterialModal}><PackagePlus size={16} /> Agregar material</Button> : null}
              </div>
              {materialsLoading ? <p className="text-sm text-[var(--text-secondary)]">Cargando materiales...</p> : null}
              {!materialsLoading && materials.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Todavía no hay materiales cargados.</p> : null}
              <div className="space-y-2">
                {materials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3 text-sm">
                    <div>
                      <p className="font-medium">{material.name}</p>
                      <p className="text-[var(--text-secondary)]">{material.quantity} × ${material.unit_cost.toFixed(2)} · Total ${(material.quantity * material.unit_cost).toFixed(2)}</p>
                    </div>
                    {canManageMaterials ? (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => openEditMaterialModal(material)}>Editar</Button>
                        <Button variant="ghost" onClick={() => void deleteMaterial(material)}><Trash2 size={16} /></Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">Auditoría reciente</p>
                <Link href={`/orders/${order.id}`} className="text-sm text-cyan-300">Ver historial completo →</Link>
              </div>
              <Timeline>
                {recentHistory.map((h) => <TimelineItem key={h.id} title={`${resolveActorName(h.usuario)} · ${getOrderHistoryFieldLabel(h.campo_modificado)}`} subtitle={`${h.valor_anterior ?? '-'} → ${h.valor_nuevo ?? '-'} · ${new Date(h.created_at).toLocaleString()}`} />)}
              </Timeline>
              <div className="mt-3">
                <ActivityTimeline events={backendTimelineEvents.length > 0 ? backendTimelineEvents : timelineEvents} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--text-secondary)]">Comentarios del equipo</p>
              <div className="space-y-2">{comments.length === 0 ? <p className="text-xs text-[var(--text-muted)]">Sin comentarios aún. Sé el primero en comentar.</p> : comments.map((c) => <div key={c.id} className="rounded-lg border border-[var(--border)] p-2 text-sm"><div className="flex items-center gap-2"><Avatar name={c.user} className="h-6 w-6" /><p className="font-medium">{c.user}</p><span className="text-xs text-[var(--text-secondary)]"><RelativeTime value={c.time} /></span></div><p className="mt-1 text-[var(--text-primary)]">{c.message}</p></div>)}</div>
              <form className="mt-2 flex gap-2" onSubmit={handleSubmit(async ({ comment }) => { if (!comment.trim()) return; const payload = { id: crypto.randomUUID(), user: `${user?.first_name ?? 'Operador'} ${user?.last_name ?? ''}`.trim(), message: comment, time: new Date().toISOString() }; setComments((v) => [...v, payload]); getSocket().emit('orders:comment', { orderId: order.id, ...payload }); reset({ comment: '' }); })}>
                <input {...register('comment')} className="h-9 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]" placeholder="Escribir comentario interno..." />
                <Button type="submit">Enviar</Button>
              </form>
            </div>

            <div>
              <p className="mb-2 text-sm text-[var(--text-secondary)]">Archivos adjuntos</p>
              <FileUploader onAdd={async (name, category) => { const result = await addDocument(name, category); if (result.ok) toast({ type: 'success', message: 'Documento agregado' }); else if (result.reason === 'duplicate') toast({ type: 'info', message: 'Ese documento ya existe para esta orden' }); else toast({ type: 'error', message: 'Nombre de documento inválido' }); }} />
              <div className="mt-2"><FileList docs={docs} onRemove={async (id) => { const result = await removeDocument(id); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} /></div>
            </div>
          </div>
        </Drawer>

        <Modal open={materialModalOpen} title={editingMaterial ? 'Editar material' : 'Agregar material'} onClose={() => { if (!materialSaving) setMaterialModalOpen(false); }}>
          <form className="space-y-3" onSubmit={saveMaterial}>
            <Input placeholder="Nombre del material" {...materialForm.register('name')} />
            <Input type="number" min="0.01" step="0.01" placeholder="Cantidad" {...materialForm.register('quantity', { valueAsNumber: true })} />
            <Input type="number" min="0" step="0.01" placeholder="Costo unitario" {...materialForm.register('unit_cost', { valueAsNumber: true })} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setMaterialModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={materialSaving}>{materialSaving ? 'Guardando...' : 'Guardar material'}</Button>
            </div>
          </form>
        </Modal>

        <Modal open={reassignOpen} title="Reasignar técnicos" onClose={() => setReassignOpen(false)}>
          <div className="space-y-2">
            {techUsers.map((tech) => {
              const checked = selectedTechnicians.includes(tech.id);
              return (
                <label key={tech.id} className="flex items-center gap-2 rounded border border-[var(--border)] p-2 text-sm">
                  <input type="checkbox" checked={checked} onChange={() => setSelectedTechnicians((prev) => checked ? prev.filter((id) => id !== tech.id) : [...prev, tech.id])} />
                  <span>{tech.first_name} {tech.last_name}</span>
                </label>
              );
            })}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReassignOpen(false)}>Cancelar</Button>
              <Button onClick={async () => { try { await OrdersApi.assignTechnicians(order.id, selectedTechnicians); toast({ type: 'success', message: 'Técnicos reasignados' }); setInitialTechnicians([...selectedTechnicians]); setReassignOpen(false); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo reasignar técnicos' }); } }}>Guardar</Button>
            </div>
          </div>
        </Modal>

        <ConfirmModal open={confirmClose} title="Descartar cambios" message="Tenés cambios sin guardar en comentarios o reasignación. ¿Cerrar igualmente?" onCancel={() => setConfirmClose(false)} onConfirm={() => { setConfirmClose(false); onClose(); }} />
        <ConfirmModal open={confirmCancel} title="Cancelar orden" message={`¿Cancelar la orden #${order.id.slice(0, 8)}? Esta acción impactará el seguimiento operativo.`} onCancel={() => { if (!cancelLoading) setConfirmCancel(false); }} onConfirm={async () => { setCancelLoading(true); try { await OrdersApi.patch(order.id, { estado: 'cancelado' }); toast({ type: 'info', message: 'Orden cancelada' }); setConfirmCancel(false); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo cancelar la orden' }); } finally { setCancelLoading(false); } }} confirmDisabled={cancelLoading} cancelDisabled={cancelLoading} />
      </>
    </ErrorBoundary>
  );
}
