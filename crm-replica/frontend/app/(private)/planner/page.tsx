'use client';

import { DragEvent, useEffect, useMemo, useState } from 'react';
import { addDays, endOfDay, format, isWithinInterval, startOfDay, startOfWeek } from 'date-fns';
import { CalendarRange, Move } from 'lucide-react';
import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { ServiceOrder, User } from '@/types/domain';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/common/skeletons';
import { StatusBadge } from '@/components/common/badges';

const ORDER_STATUSES_TO_PLAN = new Set(['service_programado', 'en_ejecucion', 'presupuesto_generado', 'documentacion_aprobada']);

type DropTarget = { techId: string; dayKey: string } | null;

export default function PlannerPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const me = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.all([OrdersApi.list({ page: 1, pageSize: 300 }), UsersApi.list()]);
      setOrders(ordersRes.items.filter((o) => ORDER_STATUSES_TO_PLAN.has(o.estado)));
      setUsers(usersRes.filter((u) => u.role === 'tecnico'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const inCell = useMemo(
    () => (techId: string, day: Date) => orders
      .filter((o) => (o.technicians ?? []).some((t) => t.technician_id === techId) && o.fecha_programada)
      .filter((o) => {
        const date = new Date(o.fecha_programada as string);
        return isWithinInterval(date, { start: startOfDay(day), end: endOfDay(day) });
      })
      .sort((a, b) => new Date(a.fecha_programada ?? 0).getTime() - new Date(b.fecha_programada ?? 0).getTime()),
    [orders]
  );

  const unscheduled = useMemo(() => orders.filter((o) => !o.fecha_programada || !o.technicians?.length), [orders]);

  const onDrop = async (event: DragEvent<HTMLDivElement>, techId: string, day: Date) => {
    event.preventDefault();
    setDropTarget(null);
    if (me?.role !== 'admin' || updatingOrderId) return;

    const orderId = event.dataTransfer.getData('order-id');
    if (!orderId) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const hours = order.fecha_programada ? format(new Date(order.fecha_programada), 'HH:mm:ss') : '09:00:00';
    const nextDate = `${format(day, 'yyyy-MM-dd')}T${hours}`;
    const currentTechId = order.technicians?.[0]?.technician_id;
    const currentDayKey = order.fecha_programada ? format(new Date(order.fecha_programada), 'yyyy-MM-dd') : null;

    if (currentTechId === techId && currentDayKey === format(day, 'yyyy-MM-dd')) {
      toast({ type: 'info', message: 'La orden ya está en ese técnico y día' });
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      await Promise.all([OrdersApi.assignTechnicians(orderId, [techId]), OrdersApi.patch(orderId, { fecha_programada: nextDate })]);
      toast({ type: 'success', message: 'Orden replanificada correctamente' });
      await load();
    } catch {
      toast({ type: 'error', message: 'No se pudo mover la orden. Reintentá.' });
      await load();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Planner semanal"
        description="Tablero de planificación por técnico y día. Arrastrá órdenes para reasignar técnico y fecha programada."
        action={<div className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)]"><Move size={16} /> {me?.role === 'admin' ? 'Drag & drop habilitado' : 'Solo visualización para técnicos'}</div>}
      />

      {loading ? <TableSkeleton rows={8} cols={6} /> : null}

      {!loading && orders.length === 0 ? <EmptyState variant="orders" title="Planner sin órdenes" subtitle="No hay servicios planificables en este momento." /> : null}

      {!loading && orders.length > 0 ? (
        <Card>
          <div className="mb-3 rounded-[10px] border border-dashed border-[var(--border)] p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium"><CalendarRange size={16} /> Pendientes de asignación</p>
            {unscheduled.length === 0 ? <p className="text-xs text-[var(--text-secondary)]">Sin órdenes pendientes.</p> : (
              <div className="flex flex-wrap gap-2">
                {unscheduled.map((order) => (
                  <div
                    key={order.id}
                    draggable={me?.role === 'admin' && !updatingOrderId}
                    onDragStart={(e) => { e.dataTransfer.setData('order-id', order.id); setDraggingOrderId(order.id); }}
                    onDragEnd={() => { setDraggingOrderId(null); setDropTarget(null); }}
                    className="w-56 cursor-grab rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface-hover)] p-2 text-xs"
                  >
                    <p className="mono font-medium">#{order.id.slice(0, 8)}</p>
                    <p>{order.client?.nombre_empresa ?? order.client_id}</p>
                    <StatusBadge value={order.estado} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {updatingOrderId ? <p className="mb-2 text-xs text-[var(--text-secondary)]">Actualizando orden #{updatingOrderId.slice(0, 8)}...</p> : null}

          <div className="grid grid-cols-6 gap-2 text-sm">
            <div className="font-semibold text-[var(--text-secondary)]">Técnico</div>
            {days.map((day) => <div key={day.toISOString()} className="font-semibold text-[var(--text-secondary)]">{format(day, 'EEE dd')}</div>)}
            {users.map((tech) => (
              <div key={tech.id} className="contents">
                <div className={`rounded-[8px] border p-2 ${dropTarget?.techId === tech.id ? 'border-blue-400 bg-blue-500/10' : 'border-[var(--border)] bg-[var(--bg-surface)]'}`}>{tech.first_name} {tech.last_name}</div>
                {days.map((day) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const highlighted = dropTarget?.techId === tech.id && dropTarget.dayKey === dayKey;
                  return (
                    <div
                      key={`${tech.id}-${day.toISOString()}`}
                      onDragOver={(e) => { e.preventDefault(); setDropTarget({ techId: tech.id, dayKey }); }}
                      onDragLeave={() => setDropTarget((current) => current?.techId === tech.id && current.dayKey === dayKey ? null : current)}
                      onDrop={(e) => void onDrop(e, tech.id, day)}
                      className={`min-h-28 rounded-[8px] border p-1 transition-colors duration-150 ${highlighted ? 'border-blue-400 bg-blue-500/10' : 'border-[var(--border)] bg-[var(--bg-surface)]'}`}
                    >
                      {inCell(tech.id, day).map((order) => (
                        <div
                          key={order.id}
                          draggable={me?.role === 'admin' && !updatingOrderId}
                          onDragStart={(e) => { e.dataTransfer.setData('order-id', order.id); setDraggingOrderId(order.id); }}
                          onDragEnd={() => { setDraggingOrderId(null); setDropTarget(null); }}
                          className={`mb-1 rounded-[8px] border p-2 text-left text-xs transition-colors duration-150 hover:bg-[var(--bg-surface-hover)] ${draggingOrderId === order.id ? 'border-blue-400' : 'border-[var(--border)]'} ${updatingOrderId === order.id ? 'opacity-60' : ''}`}
                        >
                          <p className="mono">#{order.id.slice(0, 7)}</p>
                          <p className="line-clamp-1">{order.client?.nombre_empresa ?? order.client_id}</p>
                          <p className="text-[var(--text-secondary)]">{order.fecha_programada ? format(new Date(order.fecha_programada), 'HH:mm') : '--:--'}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
