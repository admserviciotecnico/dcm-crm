import { OrderStatus } from '@/types/domain';
import { ORDER_STATUS_DEFAULT_COLOR } from '@/constants/orderStatus';
import { orderStatusStore } from '@/stores/order-status-store';

export function OrdersChart({ counts }: { counts?: Partial<Record<OrderStatus, number>> }) {
  const labelFor = orderStatusStore((s) => s.labelFor);
  const colorFor = orderStatusStore((s) => s.colorFor);
  const grouped = Object.entries(counts ?? {}).filter(([, count]) => typeof count === 'number');

  if (grouped.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">Sin datos suficientes para graficar estados.</p>;
  }

  const max = Math.max(...grouped.map(([, count]) => count as number), 1);

  return (
    <div className="space-y-3">
      {grouped.map(([status, count]) => (
        <div key={status}>
          <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
            <span>{labelFor(status)}</span>
            <span>{count}</span>
          </div>
          <div className="h-3 rounded bg-[var(--bg-surface-muted)]">
            <div className="h-3 rounded" style={{ width: `${((count as number) / max) * 100}%`, backgroundColor: colorFor(status) || ORDER_STATUS_DEFAULT_COLOR.presupuesto_generado }} />
          </div>
        </div>
      ))}
    </div>
  );
}
