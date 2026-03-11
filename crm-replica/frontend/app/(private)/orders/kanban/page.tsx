'use client';

import { DragEvent, useEffect, useMemo, useState } from 'react';
import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { OrderStatus, ServiceOrder, User } from '@/types/domain';
import { ORDER_STATUS_COLUMNS, ORDER_STATUS_LABEL } from '@/constants/orderStatus';
import { PriorityBadge } from '@/components/common/badges';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { OrderDetail } from '@/components/orders/order-detail';

export default function OrdersKanbanPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<ServiceOrder | null>(null);

  const load = async () => {
    const [ordersRes, usersRes] = await Promise.all([OrdersApi.list({ page: 1, pageSize: 300 }), UsersApi.list()]);
    setOrders(ordersRes.items);
    setUsers(usersRes);
  };

  useEffect(() => { void load(); }, []);

  const byStatus = useMemo(() => ORDER_STATUS_COLUMNS.reduce<Record<string, ServiceOrder[]>>((acc, col) => {
    acc[col] = orders.filter((o) => o.estado === col);
    return acc;
  }, {}), [orders]);

  const onDrop = async (event: DragEvent<HTMLDivElement>, nextStatus: OrderStatus) => {
    const orderId = event.dataTransfer.getData('order-id');
    if (!orderId) return;
    await OrdersApi.patch(orderId, { estado: nextStatus });
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Órdenes · Kanban</h1>
      <div className="grid gap-3 lg:grid-cols-5">
        {ORDER_STATUS_COLUMNS.map((col) => (
          <Card key={col} className="min-h-[420px]">
            <div onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()} onDrop={(e: DragEvent<HTMLDivElement>) => void onDrop(e, col)}>
              <p className="mb-3 text-sm font-semibold">{ORDER_STATUS_LABEL[col]} ({byStatus[col]?.length ?? 0})</p>
              <div className="space-y-2">
              {(byStatus[col] ?? []).map((order) => (
                <button key={order.id} draggable onDragStart={(e) => e.dataTransfer.setData('order-id', order.id)} onClick={() => setSelected(order)} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-left transition hover:border-blue-500">
                  <p className="mono text-xs">#{order.id.slice(0, 8)}</p>
                  <p className="text-sm">{order.client?.nombre_empresa ?? order.client_id}</p>
                  <div className="mt-2 flex items-center justify-between"><PriorityBadge value={order.prioridad} /><span className="text-xs text-slate-400">{order.fecha_programada ? new Date(order.fecha_programada).toLocaleDateString() : '-'}</span></div>
                  <div className="mt-2 flex -space-x-2">{(order.technicians ?? []).slice(0, 3).map((t) => <Avatar key={t.technician_id} name={users.find((u) => u.id === t.technician_id)?.first_name ?? t.technician_id} className="h-6 w-6 border border-slate-900" />)}</div>
                </button>
              ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <OrderDetail order={selected} users={users} onClose={() => setSelected(null)} onRefresh={load} />
    </div>
  );
}
