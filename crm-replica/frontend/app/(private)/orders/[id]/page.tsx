'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { InvoiceDraft, OrderHistory, OrderMaterial, ServiceOrder, User } from '@/types/domain';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { RelativeTime } from '@/components/common/relative-time';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge, PriorityBadge } from '@/components/common/badges';
import { SlaBadge } from '@/components/common/sla-badge';
import { getOrderHistoryFieldLabel, renderOrderHistoryValue } from '@/lib/order-history';
import { resolveActorName } from '@/lib/actor-name';
import { Button } from '@/components/ui/button';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { loadAssignedOrderDetail, saveAssignedOrderDetail } from '@/lib/offline/assigned-orders';
import { useOnlineStatus } from '@/hooks/use-online-status';

type HistoryFilter = 'all' | 'estado' | 'prioridad' | 'fecha_programada' | 'technicians' | 'materials' | 'observaciones_cierre' | 'tiempo_trabajado_horas' | 'checklist_cierre' | 'firma_cliente' | 'foto_trabajo_url';

function materialsTotal(materials: OrderMaterial[] | undefined) {
  return (materials ?? []).reduce((sum, material) => sum + (material.quantity * material.unit_cost), 0);
}

export default function OrderByIdPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [offlineSnapshotAt, setOfflineSnapshotAt] = useState<string | null>(null);
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft | null>(null);
  const [invoiceDraftLoading, setInvoiceDraftLoading] = useState(false);
  const toast = appStore((state) => state.pushToast);
  const online = useOnlineStatus();

  const load = async () => {
    try {
      const [orderData, historyData, usersData] = await Promise.all([OrdersApi.get(params.id), OrdersApi.history(params.id), UsersApi.list()]);
      setOrder(orderData);
      setInvoiceDraft(orderData.invoice_draft ?? null);
      setHistory(historyData);
      setUsers(usersData);
      setOfflineSnapshotAt(null);
      await saveAssignedOrderDetail(orderData);
    } catch (error) {
      const cached = await loadAssignedOrderDetail(params.id);
      if (cached) {
        setOrder(cached.order);
        setHistory([]);
        setOfflineSnapshotAt(cached.savedAt);
        toast({ type: 'info', message: 'Mostrando la orden guardada en este dispositivo' });
        return;
      }
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo cargar la orden') });
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const filteredHistory = useMemo(() => filter === 'all' ? history : history.filter((entry) => entry.campo_modificado === filter), [filter, history]);

  const techName = (id: string) => {
    const assignedUser = users.find((u) => u.id === id);
    return assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : id;
  };

  const exportPdf = async () => {
    if (!order) return;
    try {
      const blob = await OrdersApi.exportPdf(order.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `service-order-${order.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ type: 'success', message: 'PDF descargado correctamente' });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo exportar el PDF') });
    }
  };

  const generateInvoiceDraft = async () => {
    if (!order) return;
    setInvoiceDraftLoading(true);
    try {
      const created = await OrdersApi.createInvoiceDraft(order.id, { labor_rate: 0 });
      setInvoiceDraft(created);
      toast({ type: 'success', message: 'Borrador de factura generado' });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo generar el borrador de factura') });
    } finally {
      setInvoiceDraftLoading(false);
    }
  };

  if (!order) return <p className="text-sm text-[var(--text-secondary)]">Cargando orden...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orden #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-[var(--text-secondary)]">Historial completo de auditoría, materiales y cierre de service.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={order.estado} />
          <PriorityBadge value={order.prioridad} />
          <SlaBadge status={order.sla_status} slaDeadline={order.sla_deadline} />
          <Button variant="secondary" onClick={() => void exportPdf()}><Download size={16} /> Exportar PDF</Button>
          {order.estado === 'completado' ? <Button variant="secondary" onClick={() => void generateInvoiceDraft()} disabled={invoiceDraftLoading}>{invoiceDraftLoading ? 'Generando…' : invoiceDraft ? 'Borrador generado' : 'Generar borrador de factura'}</Button> : null}
        </div>
      </div>
      {!online && offlineSnapshotAt ? (
        <Card>
          <p className="text-sm text-amber-800">Modo offline activo · usando una copia sincronizada el {new Date(offlineSnapshotAt).toLocaleString()}.</p>
        </Card>
      ) : null}

      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div><p className="text-[var(--text-secondary)]">Cliente</p><p>{order.client?.nombre_empresa ?? order.client_id}</p></div>
          <div><p className="text-[var(--text-secondary)]">Estado</p><p>{order.estado}</p></div>
          <div><p className="text-[var(--text-secondary)]">Prioridad</p><p>{order.prioridad}</p></div>
          <div><p className="text-[var(--text-secondary)]">Fecha</p><p><RelativeTime value={order.fecha_programada} /></p></div>
          <div><p className="text-[var(--text-secondary)]">Horas trabajadas</p><p>{order.tiempo_trabajado_horas ?? '-'}</p></div>
          <div><p className="text-[var(--text-secondary)]">Firma cliente</p><p>{order.firma_cliente || '-'}</p></div>
          <div><p className="text-[var(--text-secondary)]">Foto trabajo</p><p>{order.foto_trabajo_url ? <a href={order.foto_trabajo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Abrir evidencia</a> : '-'}</p></div>
          <div><p className="text-[var(--text-secondary)]">Observaciones cierre</p><p>{order.observaciones_cierre || '-'}</p></div>
        </div>
      </Card>

      {invoiceDraft ? (
        <Card>
          <h2 className="mb-2 font-semibold">Borrador de factura</h2>
          <div className="grid gap-3 text-sm md:grid-cols-4">
            <div><p className="text-[var(--text-secondary)]">Horas</p><p>{invoiceDraft.labor_hours}</p></div>
            <div><p className="text-[var(--text-secondary)]">Mano de obra</p><p>{invoiceDraft.currency} {invoiceDraft.labor_amount.toFixed(2)}</p></div>
            <div><p className="text-[var(--text-secondary)]">Materiales</p><p>{invoiceDraft.currency} {invoiceDraft.materials_amount.toFixed(2)}</p></div>
            <div><p className="text-[var(--text-secondary)]">Total</p><p className="font-semibold">{invoiceDraft.currency} {invoiceDraft.total_amount.toFixed(2)}</p></div>
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Este documento es un borrador y no representa una factura emitida.</p>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-2 font-semibold">Llegada / salida registradas</h2>
        {!order.location_events?.length ? <p className="text-sm text-[var(--text-secondary)]">Todavía no hay eventos de ubicación registrados para esta orden.</p> : (
          <Table>
            <thead>
              <tr>
                <th className="p-2">Evento</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Fecha</th>
                <th className="p-2">Coordenadas</th>
              </tr>
            </thead>
            <tbody>
              {order.location_events.map((event) => (
                <tr key={event.id} className="border-t border-[var(--border)]">
                  <td className="p-2">{event.event_type === 'arrival' ? 'Llegada' : 'Salida'}</td>
                  <td className="p-2">{event.user ? `${event.user.first_name} ${event.user.last_name}`.trim() || event.user.email : 'Sistema'}</td>
                  <td className="p-2">{new Date(event.created_at).toLocaleString()}</td>
                  <td className="p-2">{event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <h2 className="mb-2 font-semibold">Técnicos asignados</h2>
          <div className="space-y-2">{(order.technicians ?? []).map((t) => <div key={t.technician_id} className="flex items-center gap-2"><Avatar name={techName(t.technician_id)} /><span>{techName(t.technician_id)}</span></div>)}</div>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">Checklist de cierre</h2>
          <div className="space-y-2 text-sm">
            {order.checklist_cierre ? Object.entries(order.checklist_cierre).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-[8px] bg-[var(--bg-surface-hover)] px-3 py-2">
                <span>{key.replace(/_/g, ' ')}</span>
                <Badge className={value ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-amber-200 bg-amber-100 text-amber-700'}>{value ? 'Sí' : 'No'}</Badge>
              </div>
            )) : <p className="text-[var(--text-secondary)]">No hay checklist de cierre cargado.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Materiales registrados</h2>
            <p className="text-sm text-[var(--text-secondary)]">{order.materials?.length ?? 0} items · Total estimado ${materialsTotal(order.materials).toFixed(2)}</p>
          </div>
        </div>
        {!order.materials?.length ? <EmptyState title="Sin materiales" subtitle="Todavía no se registraron materiales para esta orden." /> : (
          <Table>
            <thead>
              <tr>
                <th className="p-2">Material</th>
                <th className="p-2">Cantidad</th>
                <th className="p-2">Costo unitario</th>
                <th className="p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.materials.map((material) => (
                <tr key={material.id} className="border-t border-[var(--border)]">
                  <td className="p-2">{material.name}</td>
                  <td className="p-2">{material.quantity}</td>
                  <td className="p-2">${material.unit_cost.toFixed(2)}</td>
                  <td className="p-2">${(material.quantity * material.unit_cost).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Historial de auditoría</h2>
            <Badge className="border-cyan-500 text-cyan-300">{filteredHistory.length} registros</Badge>
          </div>
          <div className="w-full md:max-w-xs">
            <Select value={filter} onChange={(event) => setFilter(event.target.value as HistoryFilter)}>
              <option value="all">Todos los cambios</option>
              <option value="estado">Solo estados</option>
              <option value="prioridad">Solo prioridad</option>
              <option value="fecha_programada">Solo fecha</option>
              <option value="technicians">Solo técnicos</option>
              <option value="materials">Solo materiales</option>
              <option value="observaciones_cierre">Solo cierre</option>
              <option value="tiempo_trabajado_horas">Solo horas</option>
              <option value="checklist_cierre">Solo checklist</option>
              <option value="firma_cliente">Solo firma</option>
              <option value="foto_trabajo_url">Solo foto</option>
            </Select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState title="Sin historial para mostrar" subtitle="Todavía no hay cambios registrados para este filtro." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className="p-2">Fecha</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Campo modificado</th>
                <th className="p-2">Valor anterior</th>
                <th className="p-2">Valor nuevo</th>
                <th className="p-2">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((entry) => (
                <tr key={entry.id} className="border-t border-[var(--border)] align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="p-2">{entry.actor_name || resolveActorName(entry.usuario)}</td>
                  <td className="p-2">{getOrderHistoryFieldLabel(entry.campo_modificado)}</td>
                  <td className="p-2">{renderOrderHistoryValue(entry, entry.valor_anterior, usersById)}</td>
                  <td className="p-2">{renderOrderHistoryValue(entry, entry.valor_nuevo, usersById)}</td>
                  <td className="p-2">{entry.comentario || <span className="text-[var(--text-secondary)]">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
