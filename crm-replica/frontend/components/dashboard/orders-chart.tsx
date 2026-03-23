import { OrderStatus } from '@/types/domain';
import { ORDER_STATUS_LABEL } from '@/constants/orderStatus';

const statusColors: Record<OrderStatus, string> = {
  presupuesto_generado: 'var(--text-secondary)',
  oc_recibida: '#38bdf8',
  facturado: '#3b82f6',
  pago_recibido: '#06b6d4',
  documentacion_enviada: '#8b5cf6',
  documentacion_aprobada: '#6d28d9',
  service_programado: '#f59e0b',
  en_ejecucion: '#3b82f6',
  completado: '#10b981',
  cancelado: '#ef4444'
};

export function OrdersChart({ counts }: { counts?: Partial<Record<OrderStatus, number>> }) {
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
            <span>{ORDER_STATUS_LABEL[status as OrderStatus] ?? status.replace(/_/g, ' ')}</span>
            <span>{count}</span>
          </div>
          <div className="h-3 rounded bg-[var(--bg-surface-muted)]">
            <div className="h-3 rounded" style={{ width: `${((count as number) / max) * 100}%`, backgroundColor: statusColors[status as OrderStatus] }} />
          </div>
        </div>
      ))}
    </div>
  );
}
