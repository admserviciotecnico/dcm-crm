import { EmptyState } from '@/components/common/empty-state';
import { groupOrdersByStatus } from '@/modules/analytics/utils/aggregations';
import { ServiceOrder } from '@/types/domain';

export function OrdersByStatusChart({ orders }: { orders: ServiceOrder[] }) {
  const rows = groupOrdersByStatus(orders);
  if (rows.length === 0) return <EmptyState title="Sin datos" subtitle="No hay órdenes para el filtro aplicado." />;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]"><span>{row.label.replace(/_/g, ' ')}</span><span>{row.value}</span></div>
          <div className="h-2 rounded bg-[var(--bg-app)]"><div className="h-2 rounded bg-blue-500" style={{ width: `${(row.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
