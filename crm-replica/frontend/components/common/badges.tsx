import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { OrderStatus, Priority } from '@/types/domain';
import { Badge } from '@/components/ui/badge';

const statusColors: Record<OrderStatus, string> = {
  presupuesto_generado: 'border-slate-300 bg-slate-100 text-slate-700',
  oc_recibida: 'border-sky-200 bg-sky-100 text-sky-700',
  facturado: 'border-blue-200 bg-blue-100 text-blue-700',
  pago_recibido: 'border-cyan-200 bg-cyan-100 text-cyan-700',
  documentacion_enviada: 'border-violet-200 bg-violet-100 text-violet-700',
  documentacion_aprobada: 'border-purple-200 bg-purple-100 text-purple-700',
  service_programado: 'border-amber-200 bg-amber-100 text-amber-700',
  en_ejecucion: 'border-orange-200 bg-orange-100 text-orange-700',
  completado: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  cancelado: 'border-red-200 bg-red-100 text-red-700'
};

export function StatusBadge({ value }: { value: OrderStatus }) {
  return <Badge className={statusColors[value]}>{value.replace(/_/g, ' ')}</Badge>;
}

export function PriorityBadge({ value }: { value: Priority }) {
  if (value === 'alta') return <Badge className="border-red-200 bg-red-100 text-red-700"><AlertTriangle size={12} /> Alta</Badge>;
  if (value === 'media') return <Badge className="border-amber-200 bg-amber-100 text-amber-700"><Clock3 size={12} /> Media</Badge>;
  return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Baja</Badge>;
}
