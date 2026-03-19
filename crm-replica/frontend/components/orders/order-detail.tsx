'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { EventLog, OrderHistory, ServiceOrder, User } from '@/types/domain';
import { EventsApi, OrdersApi } from '@/lib/api/endpoints';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
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
import { ORDER_STATUS_LABEL } from '@/constants/orderStatus';

type LocalComment = { id: string; user: string; message: string; time: string };

type CommentForm = { comment: string };

const workflow: Record<string, string[]> = {
  presupuesto_generado: ['service_programado', 'cancelado'],
  service_programado: ['en_ejecucion', 'cancelado'],
  en_ejecucion: ['completado', 'cancelado'],
  completado: [],
  cancelado: [],
  oc_recibida: ['facturado', 'cancelado'],
  facturado: ['pago_recibido', 'cancelado'],
  pago_recibido: ['documentacion_enviada'],
  documentacion_enviada: ['documentacion_aprobada'],
  documentacion_aprobada: ['service_programado']
};

export function OrderDetail({ order, users, onClose, onRefresh }: { order: ServiceOrder | null; users: User[]; onClose: () => void; onRefresh: () => void }) {
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [backendEvents, setBackendEvents] = useState<EventLog[]>([]);
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [initialTechnicians, setInitialTechnicians] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<CommentForm>({ defaultValues: { comment: '' } });
  const { docs, add: addDocument, remove: removeDocument } = useDocumentsState('order', order?.id ?? '');

  useEffect(() => {
    if (!order) return;
    OrdersApi.history(order.id).then(setHistory).catch(() => setHistory([]));
    EventsApi.list({ entityType: 'order', entityId: order.id, limit: 200 }).then(setBackendEvents).catch(() => setBackendEvents([]));
    const ids = (order.technicians ?? []).map((t) => t.technician_id);
    setSelectedTechnicians(ids);
    setInitialTechnicians(ids);
    reset({ comment: '' });
  }, [order, reset]);

  useEffect(() => {
    const socket = getSocket();
    const onRemoteComment = (payload: { orderId: string; message: string; user: string }) => {
      if (!order || payload.orderId !== order.id) return;
      setComments((prev) => [...prev, { id: crypto.randomUUID(), user: payload.user, message: payload.message, time: new Date().toISOString() }]);
    };
    socket.on('orders:comment', onRemoteComment);
    return () => { socket.off('orders:comment', onRemoteComment); };
  }, [order]);

  const adminAllowed = useMemo(() => (order ? workflow[order.estado] || [] : []), [order]);
  const techUsers = users.filter((u) => u.role === 'tecnico');
  const usersById = useMemo(() => new Map(users.map((listedUser) => [listedUser.id, listedUser])), [users]);
  const timelineEvents = history.map((h) => ({ id: h.id, actor: resolveActorName(h.usuario), action: `cambió ${h.campo_modificado ?? 'estado'}`, entity: `${h.valor_nuevo ?? '-'}`, at: h.created_at }));
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
  const reassignmentDirty = selectedTechnicians.sort().join(',') !== initialTechnicians.sort().join(',');

  const requestClose = () => {
    if (isDirty || reassignmentDirty) {
      setConfirmClose(true);
      return;
    }
    onClose();
  };


  return (
    <>
      <Drawer open={!!order} title={`Orden #${order.id.slice(0, 8)}`} onClose={requestClose}>
        <div className="space-y-5">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><StatusBadge value={order.estado} /><PriorityBadge value={order.prioridad} /></div><Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-sm text-cyan-300"><ExternalLink size={14} /> Abrir página</Link></div>
          <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-[var(--text-secondary)]">Cliente</p><p>{order.client?.nombre_empresa ?? order.client_id}</p></div><div><p className="text-[var(--text-secondary)]">Dirección</p><p>{order.direccion_service ?? '-'}</p></div><div><p className="text-[var(--text-secondary)]">Fecha</p><p><RelativeTime value={order.fecha_programada} /></p></div><div><p className="text-[var(--text-secondary)]">Técnicos</p><div className="space-y-1">{(order.technicians ?? []).map((t) => <div key={t.technician_id} className="flex items-center gap-2"><Avatar name={techName(t.technician_id)} /><span>{techName(t.technician_id)}</span></div>)}</div>{user?.role === 'admin' ? <Button className="mt-2" variant="secondary" onClick={() => setReassignOpen(true)}>Reasignar técnicos</Button> : null}</div></div>

          <div>
            <p className="mb-2 text-sm text-[var(--text-secondary)]">Acciones de workflow</p>
            <div className="flex flex-wrap gap-2">
              {user?.role === 'admin' ? adminAllowed.map((next) => <Button key={next} variant="secondary" onClick={async () => { try { await OrdersApi.patch(order.id, { estado: next }); toast({ type: 'success', message: `Estado actualizado a ${next}` }); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo actualizar el estado' }); } }}>{ORDER_STATUS_LABEL[next as keyof typeof ORDER_STATUS_LABEL] ?? next}</Button>) : null}
              {canTechMove ? <Button variant="secondary" onClick={async () => { const next = order.estado === 'service_programado' ? 'en_ejecucion' : 'completado'; try { await OrdersApi.patch(order.id, { estado: next }); toast({ type: 'success', message: `Orden ${next}` }); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo actualizar la orden' }); } }}>{order.estado === 'service_programado' ? 'Iniciar' : 'Completar'}</Button> : null}
              {canCancel ? <Button variant="danger" onClick={async () => { try { await OrdersApi.patch(order.id, { estado: 'cancelado' }); toast({ type: 'info', message: 'Orden cancelada' }); onRefresh(); } catch { toast({ type: 'error', message: 'No se pudo cancelar la orden' }); } }}>{ORDER_STATUS_LABEL.cancelado}</Button> : null}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-[var(--text-secondary)]">Timeline de auditoría</p>
            <Timeline>
              {history.map((h) => <TimelineItem key={h.id} title={`${resolveActorName(h.usuario)} · ${h.campo_modificado ?? 'estado'}`} subtitle={`${h.valor_anterior ?? '-'} → ${h.valor_nuevo ?? '-'} · ${new Date(h.created_at).toISOString()}`} />)}
            </Timeline>
            <div className="mt-3">
              <ActivityTimeline events={backendTimelineEvents.length > 0 ? backendTimelineEvents : timelineEvents} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-[var(--text-secondary)]">Comentarios del equipo</p>
            <div className="space-y-2">{comments.length === 0 ? <p className="text-xs text-[var(--text-muted)]">Sin comentarios aún. Sé el primero en comentar.</p> : comments.map((c) => <div key={c.id} className="rounded-lg border border-[var(--border)] p-2 text-sm"><div className="flex items-center gap-2"><Avatar name={c.user} className="h-6 w-6" /><p className="font-medium">{c.user}</p><span className="text-xs text-[var(--text-secondary)]"><RelativeTime value={c.time} /></span></div><p className="mt-1 text-[var(--text-primary)]">{c.message}</p></div>)}</div>
            <form className="mt-2 flex gap-2" onSubmit={handleSubmit(async ({ comment }) => { if (!comment.trim()) return; const payload = { id: crypto.randomUUID(), user: `${user?.first_name ?? 'Operador'} ${user?.last_name ?? ''}`.trim(), message: comment, time: new Date().toISOString() }; setComments((v) => [...v, payload]); getSocket().emit('orders:comment', { orderId: order.id, ...payload }); reset({ comment: '' }); })}><input {...register('comment')} className="h-9 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]" placeholder="Escribir comentario interno..." /><Button type="submit">Enviar</Button></form>
          </div>

          <div>
            <p className="mb-2 text-sm text-[var(--text-secondary)]">Archivos adjuntos</p>
            <FileUploader onAdd={async (name, category) => { const result = await addDocument(name, category); if (result.ok) toast({ type: 'success', message: 'Documento agregado' }); else if (result.reason === 'duplicate') toast({ type: 'info', message: 'Ese documento ya existe para esta orden' }); else toast({ type: 'error', message: 'Nombre de documento inválido' }); }} />
            <div className="mt-2"><FileList docs={docs} onRemove={async (id) => { const result = await removeDocument(id); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} /></div>
          </div>
        </div>
      </Drawer>

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
    </>
  );
}
