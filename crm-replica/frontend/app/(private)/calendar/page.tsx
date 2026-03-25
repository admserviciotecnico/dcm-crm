'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { ServiceOrder, User } from '@/types/domain';
import { EmptyState } from '@/components/common/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/common/relative-time';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { OrderDetail } from '@/components/orders/order-detail';
import { Tabs } from '@/components/ui/tabs';

type CalendarView = 'Mes' | 'Semana' | 'Día';

function sameCalendarDay(orderDate: string | undefined, date: Date) {
  return orderDate ? isSameDay(new Date(orderDate), date) : false;
}

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('Mes');
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  const load = async () => {
    const [ordersRes, usersRes] = await Promise.all([OrdersApi.list({ page: 1, pageSize: 300 }), UsersApi.list()]);
    setOrders(ordersRes.items);
    setUsers(usersRes);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selectedDay) setSelectedDay(startOfDay(date).toISOString());
  }, [date, selectedDay]);

  const monthDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) }), [date]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) }), [date]);
  const activeDate = selectedDay ? new Date(selectedDay) : date;
  const selectedOrders = useMemo(() => orders.filter((order) => sameCalendarDay(order.fecha_programada, activeDate)), [activeDate, orders]);
  const visibleDays = view === 'Mes' ? monthDays : view === 'Semana' ? weekDays : [activeDate];

  const title = view === 'Mes'
    ? format(date, 'MMMM yyyy')
    : view === 'Semana'
      ? `${format(weekDays[0], 'd MMM')} - ${format(weekDays[weekDays.length - 1], 'd MMM yyyy')}`
      : format(activeDate, 'd MMMM yyyy');

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'Mes') setDate((current) => direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1));
    else if (view === 'Semana') setDate((current) => direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1));
    else setDate((current) => direction === 'prev' ? subDays(current, 1) : addDays(current, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setDate(today);
    setSelectedDay(startOfDay(today).toISOString());
  };

  if (!orders.length) return <EmptyState title="Sin órdenes programadas" subtitle="Cuando haya fechas de service aparecerán aquí." />;

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calendario de servicios</h1>
            <p className="text-sm text-[var(--text-secondary)]">Vista mensual, semanal y diaria de órdenes programadas.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs items={['Mes', 'Semana', 'Día']} value={view} onChange={(value) => setView(value as CalendarView)} />
            <Button variant="secondary" onClick={() => navigate('prev')}>{view === 'Mes' ? 'Mes anterior' : view === 'Semana' ? 'Semana anterior' : 'Día anterior'}</Button>
            <Button variant="secondary" onClick={goToToday}>Hoy</Button>
            <Button variant="secondary" onClick={() => navigate('next')}>{view === 'Mes' ? 'Mes siguiente' : view === 'Semana' ? 'Semana siguiente' : 'Día siguiente'}</Button>
          </div>
        </div>

        <Card>
          <p className="mb-3 text-sm text-[var(--text-secondary)]">{title}</p>

          {view === 'Mes' ? (
            <div className="grid grid-cols-7 gap-2">
              {visibleDays.map((day) => {
                const inDay = orders.filter((order) => sameCalendarDay(order.fecha_programada, day));
                const high = inDay.some((order) => order.prioridad === 'alta');
                const mid = inDay.some((order) => order.prioridad === 'media');
                const dot = high ? 'bg-red-500' : mid ? 'bg-amber-400' : 'bg-emerald-500';
                return (
                  <button key={day.toISOString()} className="min-h-24 rounded-lg border border-[var(--border)] p-2 text-left hover:bg-[var(--bg-surface-hover)]" onClick={() => setSelectedDay(day.toISOString())}>
                    <p>{format(day, 'd')}</p>
                    {inDay.length ? <><span className={`mt-2 inline-block h-2 w-2 rounded-full ${dot}`} /><p className="mt-2 text-xs text-[var(--text-secondary)]">{inDay.length} órdenes</p></> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`grid gap-3 ${view === 'Semana' ? 'md:grid-cols-7' : 'grid-cols-1'}`}>
              {visibleDays.map((day) => {
                const inDay = orders.filter((order) => sameCalendarDay(order.fecha_programada, day));
                return (
                  <div key={day.toISOString()} className="rounded-lg border border-[var(--border)] p-3">
                    <button className="w-full text-left" onClick={() => setSelectedDay(day.toISOString())}>
                      <p className="font-medium">{format(day, view === 'Semana' ? 'EEE d' : 'EEEE d')}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{inDay.length} órdenes</p>
                    </button>
                    <div className="mt-3 space-y-2">
                      {inDay.length === 0 ? <p className="text-xs text-[var(--text-secondary)]">Sin órdenes programadas.</p> : inDay.map((order) => (
                        <button key={order.id} className="block w-full rounded-lg border border-[var(--border)] p-2 text-left hover:bg-[var(--bg-surface-hover)]" onClick={() => setSelectedOrder(order)}>
                          <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{order.client?.nombre_empresa ?? order.client_id}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusBadge value={order.estado} />
                            <PriorityBadge value={order.prioridad} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <p className="mb-2 text-sm text-[var(--text-secondary)]">Órdenes del <RelativeTime value={activeDate.toISOString()} /></p>
          {selectedOrders.length ? (
            <div className="space-y-2">
              {selectedOrders.map((order) => (
                <button key={order.id} className="block w-full rounded-lg border border-[var(--border)] p-3 text-left hover:bg-[var(--bg-surface-hover)]" onClick={() => setSelectedOrder(order)}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">#{order.id.slice(0, 8)} · {order.client?.nombre_empresa ?? order.client_id}</p>
                      <p className="text-xs text-[var(--text-secondary)]">Materiales: {order.materials?.length ?? 0} · Cierre: {order.observaciones_cierre ? 'completo' : 'pendiente'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={order.estado} />
                      <PriorityBadge value={order.prioridad} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-[var(--text-secondary)]">Sin órdenes en este día</p>}
        </Card>
      </div>
      <OrderDetail order={selectedOrder} users={users} onClose={() => setSelectedOrder(null)} onRefresh={load} />
    </ErrorBoundary>
  );
}
