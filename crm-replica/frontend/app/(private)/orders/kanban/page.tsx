'use client';

import { DragEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { OrderStatus, ServiceOrder, User } from '@/types/domain';
import { PriorityBadge } from '@/components/common/badges';
import { ExternalLink } from 'lucide-react';
import { RelativeTime } from '@/components/common/relative-time';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { OrderDetail } from '@/components/orders/order-detail';
import { EmptyState } from '@/components/common/empty-state';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { orderStatusStore } from '@/stores/order-status-store';

export default function OrdersKanbanPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const toast = appStore((s) => s.pushToast);
  const kanbanColumns = orderStatusStore((s) => s.kanbanColumns());
  const labelFor = orderStatusStore((s) => s.labelFor);

  const load = async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.all([OrdersApi.list({ page: 1, pageSize: 300 }), UsersApi.list()]);
      setOrders(ordersRes.items);
      setUsers(usersRes);
      setLoadError(null);
    } catch (error) {
      const message = getApiErrorMessage(error, 'No se pudo cargar el tablero Kanban');
      setLoadError(message);
      toast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const byStatus = useMemo(() => kanbanColumns.reduce<Record<string, ServiceOrder[]>>((acc, col) => {
    acc[col] = orders.filter((o) => o.estado === col);
    return acc;
  }, {}), [kanbanColumns, orders]);
  const outOfBoard = useMemo(() => orders.filter((order) => !kanbanColumns.includes(order.estado as typeof kanbanColumns[number])), [kanbanColumns, orders]);

  const onDrop = async (event: DragEvent<HTMLDivElement>, nextStatus: OrderStatus) => {
    const orderId = event.dataTransfer.getData('order-id');
    if (!orderId) return;
    try {
      await OrdersApi.patch(orderId, { estado: nextStatus });
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'Transición no permitida') });
      await load();
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Órdenes · Kanban</h1>
      {loading ? <p className="text-sm text-[var(--text-secondary)]">Cargando tablero…</p> : null}
      {!loading && loadError ? <p className="text-sm text-red-300">{loadError}</p> : null}
      {!loading && orders.length === 0 ? <EmptyState variant="orders" title="Sin órdenes para Kanban" subtitle="Creá órdenes para visualizar el tablero operativo." /> : null}
      {!loading && orders.length > 0 ? <div className="grid gap-3 lg:grid-cols-5">
        {kanbanColumns.map((col) => (
          <Card key={col} className="min-h-[420px]">
            <div onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()} onDrop={(e: DragEvent<HTMLDivElement>) => void onDrop(e, col)}>
              <p className="mb-3 text-sm font-semibold">{labelFor(col)} ({byStatus[col]?.length ?? 0})</p>
              <div className="space-y-2">
              {(byStatus[col] ?? []).map((order) => (
                <button key={order.id} draggable onDragStart={(e) => e.dataTransfer.setData('order-id', order.id)} onClick={() => setSelected(order)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left transition hover:border-blue-500">
                  <p className="mono text-xs">#{order.id.slice(0, 8)}</p>
                  <p className="text-sm">{order.client?.nombre_empresa ?? order.client_id}</p>
                  <div className="mt-2 flex items-center justify-between"><PriorityBadge value={order.prioridad} /><span className="text-xs text-[var(--text-secondary)]"><RelativeTime value={order.fecha_programada} /></span></div>
                  <div className="mt-2 flex items-center justify-between"><div className="flex -space-x-2">{(order.technicians ?? []).slice(0, 3).map((t) => <Avatar key={t.technician_id} name={users.find((u) => u.id === t.technician_id)?.first_name ?? t.technician_id} className="h-6 w-6 border border-[var(--bg-surface)]" />)}</div><Link href={`/orders/${order.id}`} className="rounded p-1 hover:bg-[var(--bg-surface-hover)]"><ExternalLink size={14} /></Link></div>
                </button>
              ))}
              </div>
            </div>
          </Card>
        ))}
        {outOfBoard.length ? (
          <Card className="min-h-[420px]">
            <div>
              <p className="mb-1 text-sm font-semibold">Fuera de workflow Kanban ({outOfBoard.length})</p>
              <p className="mb-3 text-xs text-[var(--text-secondary)]">Incluye estados de catálogo no soportados por drag & drop operativo.</p>
              <div className="space-y-2">
                {outOfBoard.map((order) => (
                  <button key={order.id} onClick={() => setSelected(order)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left transition hover:border-blue-500">
                    <p className="mono text-xs">#{order.id.slice(0, 8)}</p>
                    <p className="text-sm">{order.client?.nombre_empresa ?? order.client_id}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{labelFor(order.estado)}</p>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        ) : null}
      </div> : null}
      <OrderDetail order={selected} users={users} onClose={() => setSelected(null)} onRefresh={load} />
    </div>
  );
}
