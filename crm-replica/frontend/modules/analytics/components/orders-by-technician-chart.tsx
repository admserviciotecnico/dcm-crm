import { ServiceOrder, User } from '@/types/domain';
import { groupOrdersByTechnician } from '@/modules/analytics/utils/aggregations';

export function OrdersByTechnicianChart({ orders, users }: { orders: ServiceOrder[]; users: User[] }) {
  const rows = groupOrdersByTechnician(orders).slice(0, 8).map((r) => ({
    ...r,
    label: users.find((u) => u.id === r.label) ? `${users.find((u) => u.id === r.label)?.first_name}` : r.label
  }));
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]"><span>{row.label}</span><span>{row.value}</span></div>
          <div className="h-2 rounded bg-slate-200"><div className="h-2 rounded bg-emerald-500" style={{ width: `${(row.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
