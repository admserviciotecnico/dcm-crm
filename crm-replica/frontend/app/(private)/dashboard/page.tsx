'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardApi, OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { useRealtime } from '@/hooks/use-realtime';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { ServiceOrder, User } from '@/types/domain';
import { OrdersChart } from '@/components/dashboard/orders-chart';
import { appStore } from '@/stores/app-store';

export default function DashboardPage() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const notifications = appStore((s) => s.notifications);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpis, recent, usersRes] = await Promise.all([DashboardApi.kpis(), OrdersApi.list({ page: 1, pageSize: 100 }), UsersApi.list()]);
      setData(kpis);
      setOrders(recent.items);
      setUsers(usersRes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtime(load);

  const avgResolution = useMemo(() => {
    const completed = orders.filter((o) => o.estado === 'completado' && o.fecha_programada);
    if (completed.length === 0) return 0;
    const avgDays = completed.reduce((acc, o) => acc + Math.max(1, Math.ceil((Date.now() - new Date(o.fecha_programada ?? new Date()).getTime()) / 86400000)), 0) / completed.length;
    return Math.round(avgDays);
  }, [orders]);

  const topTech = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => (o.technicians ?? []).forEach((t) => { counts[t.technician_id] = (counts[t.technician_id] ?? 0) + 1; }));
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!best) return '-';
    const user = users.find((u) => u.id === best[0]);
    return `${user?.first_name ?? best[0]} (${best[1]})`;
  }, [orders, users]);

  const byTech = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => (o.technicians ?? []).forEach((t) => { counts[t.technician_id] = (counts[t.technician_id] ?? 0) + 1; }));
    return Object.entries(counts).map(([id, count]) => ({ label: users.find((u) => u.id === id)?.first_name ?? id, count }));
  }, [orders, users]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Service Overview</h1>
      <KpiCards data={data} loading={loading} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-xs text-slate-400">Órdenes abiertas</p><p className="text-2xl font-bold">{orders.filter((o) => o.estado !== 'completado' && o.estado !== 'cancelado').length}</p></Card>
        <Card><p className="text-xs text-slate-400">Tiempo promedio de resolución</p><p className="text-2xl font-bold">{avgResolution} días</p></Card>
        <Card><p className="text-xs text-slate-400">Técnico con más órdenes</p><p className="text-xl font-bold">{topTech}</p></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-3 font-semibold">Órdenes por estado</h2>
          <OrdersChart orders={orders} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Actividad del sistema</h2>
          <Timeline>
            {notifications.slice(0, 4).map((n) => (
              <TimelineItem key={n.id} title={n.title} subtitle={`${n.message} · ${new Date(n.createdAt).toLocaleTimeString()}`} />
            ))}
          </Timeline>
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 font-semibold">Órdenes por técnico</h2>
        <div className="space-y-2">{byTech.map((t) => <div key={t.label}><div className="mb-1 flex justify-between text-xs"><span>{t.label}</span><span>{t.count}</span></div><div className="h-2 rounded bg-slate-700"><div className="h-2 rounded bg-cyan-500" style={{ width: `${Math.min(100, t.count * 20)}%` }} /></div></div>)}</div>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Órdenes recientes</h2><a href="/orders" className="text-sm text-blue-400">Ver todas</a></div>
        <Table>
          <thead className="bg-slate-900/70 text-left text-xs uppercase text-slate-400"><tr><th className="p-2">ID</th><th className="p-2">Cliente</th><th className="p-2">Estado</th><th className="p-2">Prioridad</th><th className="p-2">Fecha</th></tr></thead>
          <tbody>
            {orders.slice(0, 8).map((o) => <tr key={o.id} className="border-t border-slate-700"><td className="mono p-2">#{o.id.slice(0, 8)}</td><td className="p-2">{o.client?.nombre_empresa ?? o.client_id}</td><td className="p-2"><StatusBadge value={o.estado} /></td><td className="p-2"><PriorityBadge value={o.prioridad} /></td><td className="p-2">{o.fecha_programada ? new Date(o.fecha_programada).toLocaleDateString() : '-'}</td></tr>)}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
