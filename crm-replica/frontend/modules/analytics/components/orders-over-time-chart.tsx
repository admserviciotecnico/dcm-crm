import { ServiceOrder } from '@/types/domain';
import { ordersOverTime } from '@/modules/analytics/utils/aggregations';

export function OrdersOverTimeChart({ orders }: { orders: ServiceOrder[] }) {
  const rows = ordersOverTime(orders);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="grid grid-cols-14 items-end gap-1">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col items-center gap-1">
          <div className="w-full rounded bg-blue-500/20" style={{ height: `${Math.max(8, (row.value / max) * 120)}px` }} title={`${row.label}: ${row.value}`} />
          <span className="text-[10px] text-[var(--text-secondary)]">{row.label}</span>
        </div>
      ))}
    </div>
  );
}
