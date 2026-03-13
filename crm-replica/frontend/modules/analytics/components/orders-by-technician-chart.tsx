import { EmptyState } from '@/components/common/empty-state';
import { ServiceOrder, User } from '@/types/domain';
import { groupOrdersByTechnician } from '@/modules/analytics/utils/aggregations';

export function OrdersByTechnicianChart({ orders, users }: { orders: ServiceOrder[]; users: User[] }) {
  const rows = groupOrdersByTechnician(orders).slice(0, 8).map((r) => {
    const user = users.find((u) => u.id === r.label);
    return { ...r, label: user ? `${user.first_name} ${user.last_name}` : r.label };
  });

  if (rows.length === 0) return <EmptyState title="Sin asignaciones" subtitle="No hay técnicos con órdenes en el período." />;
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]"><span>{row.label}</span><span>{row.value}</span></div>
          <div className="h-2 rounded bg-[var(--bg-app)]"><div className="h-2 rounded bg-emerald-500" style={{ width: `${(row.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
