'use client';

import { DragEvent, useEffect, useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { ServiceOrder, User } from '@/types/domain';
import { authStore } from '@/stores/auth-store';
import { Card } from '@/components/ui/card';
 codex/fix-cors-error-in-backend-izagw1
import { EmptyState } from '@/components/common/empty-state';

 main

export default function PlannerPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const me = authStore((s) => s.user);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const load = async () => {
    const [ordersRes, usersRes] = await Promise.all([OrdersApi.list({ page: 1, pageSize: 300 }), UsersApi.list()]);
    setOrders(ordersRes.items);
    setUsers(usersRes.filter((u) => u.role === 'tecnico'));
  };

  useEffect(() => { void load(); }, []);

  const inCell = useMemo(() => (techId: string, day: Date) => orders.filter((o) => (o.technicians ?? []).some((t) => t.technician_id === techId) && o.fecha_programada && new Date(o.fecha_programada).toDateString() === day.toDateString()), [orders]);

  const onDrop = async (event: DragEvent<HTMLDivElement>, techId: string) => {
    if (me?.role !== 'admin') return;
    const orderId = event.dataTransfer.getData('order-id');
    if (!orderId) return;
    await OrdersApi.assignTechnicians(orderId, [techId]);
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Planner semanal de técnicos</h1>
 codex/fix-cors-error-in-backend-izagw1
      {orders.length === 0 ? <EmptyState variant="orders" title="Planner sin órdenes" subtitle="No hay servicios asignados para esta semana." /> : <Card>

      <Card>
 main
        <div className="grid grid-cols-6 gap-2 text-sm">
          <div className="font-semibold text-slate-400">Técnico</div>
          {days.map((day) => <div key={day.toISOString()} className="font-semibold text-slate-400">{format(day, 'EEE dd')}</div>)}
          {users.map((tech) => (
            <div key={tech.id} className="contents">
              <div className="rounded border border-slate-700 p-2">{tech.first_name} {tech.last_name}</div>
              {days.map((day) => (
                <div key={`${tech.id}-${day.toISOString()}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => void onDrop(e, tech.id)} className="min-h-24 rounded border border-slate-700 p-1">
                  {inCell(tech.id, day).map((order) => (
                    <div key={order.id} draggable={me?.role === 'admin'} onDragStart={(e) => e.dataTransfer.setData('order-id', order.id)} className="mb-1 rounded bg-slate-800 p-1 text-xs">
                      <p className="mono">#{order.id.slice(0, 7)}</p>
                      <p>{order.client?.nombre_empresa ?? order.client_id}</p>
                      <p className="text-slate-400">{order.fecha_programada ? format(new Date(order.fecha_programada), 'HH:mm') : '--:--'}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
 codex/fix-cors-error-in-backend-izagw1
      </Card>}

      </Card>
 main
    </div>
  );
}
