import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { OrderStatus, Priority } from '@/types/domain';
import { orderStatusStore } from '@/stores/order-status-store';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ value }: { value: OrderStatus }) {
  const label = orderStatusStore((s) => s.labelFor(value));
  const color = orderStatusStore((s) => s.colorFor(value));
  return <span className="inline-flex h-[22px] items-center gap-1 rounded-full border px-2 text-xs font-medium" style={{ backgroundColor: `${color}22`, color, borderColor: `${color}66` }}>{label}</span>;
}

export function PriorityBadge({ value }: { value: Priority }) {
  if (value === 'alta') return <Badge className="border-red-200 bg-red-100 text-red-700"><AlertTriangle size={12} /> Alta</Badge>;
  if (value === 'media') return <Badge className="border-amber-200 bg-amber-100 text-amber-700"><Clock3 size={12} /> Media</Badge>;
  return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Baja</Badge>;
}
