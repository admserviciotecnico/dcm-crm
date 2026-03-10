import { ServiceOrder, OrderStatus } from '@/types/domain';

const statusColors: Record<OrderStatus, string> = {
  presupuesto_generado: '#64748b',
  oc_recibida: '#38bdf8',
  facturado: '#3b82f6',
  pago_recibido: '#06b6d4',
  documentacion_enviada: '#8b5cf6',
  documentacion_aprobada: '#6d28d9',
  service_programado: '#f59e0b',
  en_ejecucion: '#f97316',
  completado: '#10b981',
  cancelado: '#ef4444'
};

export function OrdersChart({ orders }: { orders: ServiceOrder[] }) {
  const grouped = Object.entries(
    orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.estado] = (acc[order.estado] ?? 0) + 1;
      return acc;
    }, {})
  );

  const max = Math.max(...grouped.map(([, count]) => count), 1);

  return (
    <div className="space-y-3">
      {grouped.map(([status, count]) => (
        <div key={status}>
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>{status.replace(/_/g, ' ')}</span>
            <span>{count}</span>
          </div>
          <div className="h-3 rounded bg-slate-700">
            <div className="h-3 rounded" style={{ width: `${(count / max) * 100}%`, backgroundColor: statusColors[status as OrderStatus] }} />
          </div>
        </div>
      ))}
    </div>
  );
}
