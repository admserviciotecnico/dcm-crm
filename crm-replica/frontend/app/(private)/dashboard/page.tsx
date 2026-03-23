'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardApi, OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { useRealtime } from '@/hooks/use-realtime';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { DashboardKpis, ServiceOrder, User } from '@/types/domain';
import { OrdersChart } from '@/components/dashboard/orders-chart';
import { appStore } from '@/stores/app-store';
import { RelativeTime } from '@/components/common/relative-time';
import { ErrorBoundary } from '@/components/common/error-boundary';

function formatResolution(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return 'N/D';
  if (value < 24) return `${value}h`;
  return `${(value / 24).toFixed(1)} días`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardKpis | null>(null);
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

  const topTech = useMemo(() => {
    const technicians = users.filter((user) => user.role === 'tecnico');
    const best = technicians
      .map((user) => ({
        name: `${user.first_name} ${user.last_name}`.trim(),
        active: user.metrics?.active_orders ?? 0,
        completed: user.metrics?.completed_orders ?? 0
      }))
      .sort((a, b) => b.completed - a.completed || b.active - a.active)[0];

    if (!best) return '-';
    return `${best.name} · ${best.completed} cerradas`;
  }, [users]);

  const completedTrend = useMemo(() => {
    const current = data?.completed_last_week ?? 0;
    const previous = data?.completed_prev_week ?? 0;
    const diff = ((current - previous) / Math.max(previous, 1)) * 100;
    return Math.round(diff);
  }, [data]);

  const trendClassName = completedTrend > 0 ? 'text-emerald-600' : completedTrend < 0 ? 'text-red-600' : 'text-[var(--text-secondary)]';

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Service Overview</h1>
        <KpiCards data={data} loading={loading} />

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <p className="text-xs text-[var(--text-secondary)]">Completadas esta semana</p>
            <p className="mt-2 text-2xl font-bold">{data?.completed_last_week ?? 0}</p>
            <p className={`mt-1 text-xs ${trendClassName}`}>{completedTrend > 0 ? '▲' : completedTrend < 0 ? '▼' : '•'} {completedTrend}% vs. semana anterior</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--text-secondary)]">Semana anterior</p>
            <p className="mt-2 text-2xl font-bold">{data?.completed_prev_week ?? 0}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Comparativo de 7 días previos.</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--text-secondary)]">Resolución promedio</p>
            <p className="mt-2 text-2xl font-bold">{formatResolution(data?.avg_resolution_hours)}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Promedio sobre cierres de los últimos 30 días.</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--text-secondary)]">Demoradas activas</p>
            <p className="mt-2 text-2xl font-bold">{data?.delayed ?? 0}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Técnico destacado: {topTech}</p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <h2 className="mb-3 font-semibold">Órdenes por estado</h2>
            <OrdersChart counts={data?.orders_by_status} />
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Actividad del sistema</h2>
            <Timeline>
              {notifications.slice(0, 4).map((n) => (
                <TimelineItem key={n.id} title={n.title} subtitle={`${n.description} · ${new Date(n.created_at).toLocaleTimeString()}`} />
              ))}
            </Timeline>
          </Card>
        </div>

        <Card>
          <h2 className="mb-3 font-semibold">Resumen operativo</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Órdenes abiertas</p>
              <p className="mt-1 text-xl font-semibold">{data?.open_orders ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">En ejecución</p>
              <p className="mt-1 text-xl font-semibold">{data?.in_progress ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">SLA vencido</p>
              <p className={`mt-1 text-xl font-semibold ${(data?.sla_breached ?? 0) > 0 ? 'text-red-600' : ''}`}>{data?.sla_breached ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">SLA crítico</p>
              <p className={`mt-1 text-xl font-semibold ${(data?.sla_critical ?? 0) > 0 ? 'text-orange-600' : ''}`}>{data?.sla_critical ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Órdenes recientes</h2><a href="/orders" className="text-sm text-blue-400">Ver todas</a></div>
          <Table>
            <thead className="bg-[var(--bg-surface-muted)] text-left text-xs uppercase text-[var(--text-secondary)]"><tr><th className="p-2">ID</th><th className="p-2">Cliente</th><th className="p-2">Estado</th><th className="p-2">Prioridad</th><th className="p-2">Fecha</th></tr></thead>
            <tbody>
              {orders.slice(0, 8).map((o) => <tr key={o.id} className="border-t border-[var(--border)]"><td className="mono p-2">#{o.id.slice(0, 8)}</td><td className="p-2">{o.client?.nombre_empresa ?? o.client_id}</td><td className="p-2"><StatusBadge value={o.estado} /></td><td className="p-2"><PriorityBadge value={o.prioridad} /></td><td className="p-2"><RelativeTime value={o.fecha_programada} /></td></tr>)}
            </tbody>
          </Table>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
