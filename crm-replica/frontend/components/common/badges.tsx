import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { OrderStatus, Priority } from '@/types/domain';
import { Badge } from '@/components/ui/badge';

const statusColors: Record<OrderStatus, string> = {
  presupuesto_generado: 'bg-slate-700',
  oc_recibida: 'bg-sky-700',
  facturado: 'bg-blue-700',
  pago_recibido: 'bg-cyan-700',
  documentacion_enviada: 'bg-violet-600',
  documentacion_aprobada: 'bg-purple-700',
  service_programado: 'bg-amber-600',
  en_ejecucion: 'bg-orange-600',
  completado: 'bg-emerald-700',
  cancelado: 'bg-red-700'
};

export function StatusBadge({ value }: { value: OrderStatus }) {
  return <Badge className={`${statusColors[value]} border-transparent text-white`}>{value.replace(/_/g, ' ')}</Badge>;
}

export function PriorityBadge({ value }: { value: Priority }) {
  if (value === 'alta') return <Badge className="border-red-500 bg-red-500/20 text-red-300"><AlertTriangle size={12} /> Alta</Badge>;
  if (value === 'media') return <Badge className="border-amber-500 bg-amber-500/20 text-amber-300"><Clock3 size={12} /> Media</Badge>;
  return <Badge className="border-emerald-500 bg-emerald-500/20 text-emerald-300"><CheckCircle2 size={12} /> Baja</Badge>;
}
