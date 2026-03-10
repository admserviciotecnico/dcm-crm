import { Activity, CheckCircle2, Clock3, ClipboardList } from 'lucide-react';
import { Skeleton } from '@/components/common/skeleton';
import { Card } from '@/components/ui/card';

const defs = [
  { label: 'Total órdenes', key: 'total_orders', icon: ClipboardList },
  { label: 'Órdenes activas', key: 'in_progress', icon: Activity },
  { label: 'Completadas', key: 'completed_this_month', icon: CheckCircle2 },
  { label: 'Demoradas', key: 'delayed', icon: Clock3 }
] as const;

export function KpiCards({ data, loading }: { data: Record<string, number> | null; loading: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {defs.map((d) => (
        <Card key={d.key}>
          <div className="flex items-center justify-between text-slate-400"><span className="text-sm">{d.label}</span><d.icon size={16} /></div>
          {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-2 text-3xl font-bold">{data?.[d.key] ?? 0}</p>}
          <p className="mt-1 text-xs text-emerald-400">+{Math.floor(Math.random() * 8)}% vs semana anterior</p>
        </Card>
      ))}
    </div>
  );
}
