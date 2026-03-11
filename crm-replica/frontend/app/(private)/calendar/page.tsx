'use client';

import { useEffect, useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { OrdersApi } from '@/lib/api/endpoints';
import { ServiceOrder } from '@/types/domain';
import { EmptyState } from '@/components/common/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/common/relative-time';

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => { OrdersApi.list({ page: 1, pageSize: 300 }).then((d) => setOrders(d.items)); }, [date]);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) }), [date]);
  const selectedOrders = orders.filter((o) => o.fecha_programada && selectedDay && new Date(o.fecha_programada).toDateString() === new Date(selectedDay).toDateString());

  if (!orders.length) return <EmptyState title="Sin órdenes programadas" subtitle="Cuando haya fechas de service aparecerán aquí." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Calendario de servicios</h1><div className="flex gap-2"><Button variant="secondary" onClick={() => setDate(subMonths(date, 1))}>Mes anterior</Button><Button variant="secondary" onClick={() => setDate(addMonths(date, 1))}>Mes siguiente</Button></div></div>
      <Card>
        <p className="mb-3 text-sm text-slate-400">{format(date, 'MMMM yyyy')}</p>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const inDay = orders.filter((o) => o.fecha_programada && new Date(o.fecha_programada).toDateString() === d.toDateString());
            const high = inDay.some((o) => o.prioridad === 'alta');
            const mid = inDay.some((o) => o.prioridad === 'media');
            const dot = high ? 'bg-red-500' : mid ? 'bg-amber-400' : 'bg-emerald-500';
            return <button key={d.toISOString()} className="min-h-24 rounded-lg border border-slate-700 p-2 text-left hover:bg-slate-800" onClick={() => setSelectedDay(d.toISOString())}><p>{format(d, 'd')}</p>{inDay.length ? <span className={`mt-2 inline-block h-2 w-2 rounded-full ${dot}`} /> : null}</button>;
          })}
        </div>
      </Card>
      {selectedDay ? <Card><p className="mb-2 text-sm text-slate-400">Órdenes del <RelativeTime value={selectedDay} /></p>{selectedOrders.length ? selectedOrders.map((o) => <p key={o.id} className="text-sm">#{o.id.slice(0, 8)} · {o.client?.nombre_empresa ?? o.client_id}</p>) : <p className="text-sm text-slate-400">Sin órdenes en este día</p>}</Card> : null}

      {selectedDay ? <Card><p className="mb-2 text-sm text-slate-400">Órdenes del {new Date(selectedDay).toLocaleDateString()}</p>{selectedOrders.length ? selectedOrders.map((o) => <p key={o.id} className="text-sm">#{o.id.slice(0, 8)} · {o.client?.nombre_empresa ?? o.client_id}</p>) : <p className="text-sm text-slate-400">Sin órdenes en este día</p>}</Card> : null}
    </div>
  );
}
