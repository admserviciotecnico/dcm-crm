'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { OrderHistory, ServiceOrder, User } from '@/types/domain';
import { OrdersApi } from '@/lib/api/endpoints';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { getSocket } from '@/lib/api/socket';

type LocalFile = { name: string; url: string; size: number };
type LocalComment = { id: string; user: string; message: string; time: string };

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
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<LocalComment[]>([]);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);

  useEffect(() => {
    if (!order) return;
    OrdersApi.history(order.id).then(setHistory).catch(() => setHistory([]));
    setSelectedTechnicians((order.technicians ?? []).map((t) => t.technician_id));
  }, [order]);

  useEffect(() => {
    const socket = getSocket();
    const onRemoteComment = (payload: { orderId: string; message: string; user: string }) => {
      if (!order || payload.orderId !== order.id) return;
      setComments((prev) => [...prev, { id: crypto.randomUUID(), user: payload.user, message: payload.message, time: new Date().toISOString() }]);
    };
    socket.on('orders:comment', onRemoteComment);
    return () => {
      socket.off('orders:comment', onRemoteComment);
    };
  }, [order]);

  const adminAllowed = useMemo(() => (order ? workflow[order.estado] || [] : []), [order]);
  const techUsers = users.filter((u) => u.role === 'tecnico');

  if (!order) return null;

  const techName = (id: string) => {
    const tech = users.find((u) => u.id === id);
    return tech ? `${tech.first_name} ${tech.last_name}` : id;
  };

  const canTechMove = user?.role === 'tecnico' && (order.estado === 'service_programado' || order.estado === 'en_ejecucion');

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const inputFiles = event.target.files;
    if (!inputFiles) return;
    const newFiles: LocalFile[] = Array.from(inputFiles).map((file) => ({ name: file.name, size: file.size, url: URL.createObjectURL(file) }));
    setFiles((prev) => [...prev, ...newFiles]);
    toast({ type: 'success', message: 'Archivo adjuntado localmente' });
  };

  return (
    <>
      <Drawer open={!!order} title={`Orden #${order.id.slice(0, 8)}`} onClose={onClose}>
        <div className="space-y-5">
          <div className="flex items-center gap-2"><StatusBadge value={order.estado} /><PriorityBadge value={order.prioridad} /></div>
          <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-400">Cliente</p><p>{order.client?.nombre_empresa ?? order.client_id}</p></div><div><p className="text-slate-400">Dirección</p><p>{order.direccion_service ?? '-'}</p></div><div><p className="text-slate-400">Fecha</p><p>{order.fecha_programada ? new Date(order.fecha_programada).toLocaleDateString() : '-'}</p></div><div><p className="text-slate-400">Técnicos</p><div className="space-y-1">{(order.technicians ?? []).map((t) => <div key={t.technician_id} className="flex items-center gap-2"><Avatar name={techName(t.technician_id)} /><span>{techName(t.technician_id)}</span></div>)}</div>{user?.role === 'admin' ? <Button className="mt-2" variant="secondary" onClick={() => setReassignOpen(true)}>Reasignar técnicos</Button> : null}</div></div>

          <div>
            <p className="mb-2 text-sm text-slate-400">Acciones de workflow</p>
            <div className="flex flex-wrap gap-2">
              {user?.role === 'admin' ? adminAllowed.map((next) => <Button key={next} variant="secondary" onClick={async () => { await OrdersApi.patch(order.id, { estado: next }); toast({ type: 'success', message: `Estado actualizado a ${next}` }); onRefresh(); }}>{next}</Button>) : null}
              {canTechMove ? <Button variant="secondary" onClick={async () => { const next = order.estado === 'service_programado' ? 'en_ejecucion' : 'completado'; await OrdersApi.patch(order.id, { estado: next }); toast({ type: 'success', message: `Orden ${next}` }); onRefresh(); }}>{order.estado === 'service_programado' ? 'Iniciar' : 'Completar'}</Button> : null}
              <Button variant="danger" onClick={async () => { await OrdersApi.patch(order.id, { estado: 'cancelado' }); toast({ type: 'info', message: 'Orden cancelada' }); onRefresh(); }}>cancelar</Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-400">Timeline de auditoría</p>
            <Timeline>
              {history.map((h) => <TimelineItem key={h.id} title={`${h.usuario?.email ?? 'sistema'} · ${h.campo_modificado ?? 'estado'}`} subtitle={`${h.valor_anterior ?? '-'} → ${h.valor_nuevo ?? '-'} · ${new Date(h.created_at).toLocaleString()}`} />)}
            </Timeline>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-400">Comentarios del equipo</p>
            <div className="space-y-2">{comments.map((c) => <div key={c.id} className="rounded-lg border border-slate-700 p-2 text-sm"><div className="flex items-center gap-2"><Avatar name={c.user} className="h-6 w-6" /><p className="font-medium">{c.user}</p><span className="text-xs text-slate-500">{new Date(c.time).toLocaleTimeString()}</span></div><p className="mt-1 text-slate-300">{c.message}</p></div>)}</div>
            <div className="mt-2 flex gap-2"><input value={comment} onChange={(e) => setComment(e.target.value)} className="h-9 flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm" placeholder="Escribir comentario interno..." /><Button onClick={() => { if (!comment.trim()) return; const payload = { id: crypto.randomUUID(), user: `${user?.first_name ?? 'Operador'} ${user?.last_name ?? ''}`.trim(), message: comment, time: new Date().toISOString() }; setComments((v) => [...v, payload]); getSocket().emit('orders:comment', { orderId: order.id, ...payload }); setComment(''); }}>Enviar</Button></div>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-400">Archivos adjuntos</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-700 px-3 py-2 text-sm"><Upload size={14} /> Subir archivos<input type="file" multiple className="hidden" onChange={onUpload} /></label>
            <div className="mt-2 space-y-2">{files.map((file) => <div key={file.url} className="flex items-center justify-between rounded border border-slate-700 p-2 text-sm"><span>{file.name} ({Math.ceil(file.size / 1024)} KB)</span><a className="inline-flex items-center gap-1 text-blue-300" href={file.url} download={file.name}><Download size={12} /> Descargar</a></div>)}</div>
          </div>
        </div>
      </Drawer>

      <Modal open={reassignOpen} title="Reasignar técnicos" onClose={() => setReassignOpen(false)}>
        <div className="space-y-2">
          {techUsers.map((tech) => {
            const checked = selectedTechnicians.includes(tech.id);
            return (
              <label key={tech.id} className="flex items-center gap-2 rounded border border-slate-700 p-2 text-sm">
                <input type="checkbox" checked={checked} onChange={() => setSelectedTechnicians((prev) => checked ? prev.filter((id) => id !== tech.id) : [...prev, tech.id])} />
                <span>{tech.first_name} {tech.last_name}</span>
              </label>
            );
          })}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReassignOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              await OrdersApi.assignTechnicians(order.id, selectedTechnicians);
              toast({ type: 'success', message: 'Técnicos reasignados' });
              setReassignOpen(false);
              onRefresh();
            }}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
