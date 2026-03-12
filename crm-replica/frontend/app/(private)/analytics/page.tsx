'use client';

import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/common/skeletons';
import { useAnalyticsData } from '@/modules/analytics/hooks/use-analytics-data';
import { AnalyticsKpiCard } from '@/modules/analytics/components/analytics-kpi-card';
import { OrdersByStatusChart } from '@/modules/analytics/components/orders-by-status-chart';
import { OrdersByTechnicianChart } from '@/modules/analytics/components/orders-by-technician-chart';
import { OrdersOverTimeChart } from '@/modules/analytics/components/orders-over-time-chart';

export default function AnalyticsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [clientId, setClientId] = useState('');

  const { orders, users, loading } = useAnalyticsData({ from, to, technicianId, clientId });

  const metrics = useMemo(() => {
    const open = orders.filter((o) => o.estado !== 'completado' && o.estado !== 'cancelado').length;
    const delayed = orders.filter((o) => o.delayed).length;
    const completed = orders.filter((o) => o.estado === 'completado').length;
    const avgResolution = completed === 0 ? 0 : Math.round(orders.filter((o) => o.estado === 'completado' && o.fecha_programada).reduce((acc, o) => acc + Math.max(1, Math.ceil((Date.now() - new Date(o.fecha_programada ?? new Date()).getTime()) / 86400000)), 0) / completed);
    return { open, delayed, completed, avgResolution };
  }, [orders]);

  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" description="Métricas operativas para gestión de servicios técnicos." />
      <Card>
        <div className="grid gap-2 md:grid-cols-4">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}><option value="">Todos los técnicos</option>{users.filter((u) => u.role === 'tecnico').map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</Select>
          <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Filtrar por client_id" />
        </div>
      </Card>

      {loading ? <TableSkeleton rows={8} cols={4} /> : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <AnalyticsKpiCard label="Órdenes abiertas" value={metrics.open} icon={<Activity size={16} />} />
            <AnalyticsKpiCard label="Órdenes demoradas" value={metrics.delayed} icon={<AlertTriangle size={16} />} />
            <AnalyticsKpiCard label="Completadas este período" value={metrics.completed} icon={<CheckCircle2 size={16} />} />
            <AnalyticsKpiCard label="Tiempo promedio de resolución" value={`${metrics.avgResolution} días`} icon={<Clock3 size={16} />} />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card>
              <h2 className="mb-3 text-lg font-medium">Órdenes por estado</h2>
              <OrdersByStatusChart orders={orders} />
            </Card>
            <Card>
              <h2 className="mb-3 text-lg font-medium">Órdenes por técnico</h2>
              <OrdersByTechnicianChart orders={orders} users={users} />
            </Card>
            <Card>
              <h2 className="mb-3 text-lg font-medium">Órdenes en el tiempo</h2>
              <OrdersOverTimeChart orders={orders} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
