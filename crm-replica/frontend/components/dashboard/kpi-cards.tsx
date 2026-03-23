import { AlertTriangle, CheckCircle2, ClipboardList, ShieldAlert, TimerOff, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/common/skeleton';
import { Card } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { DashboardKpis } from '@/types/domain';

const defs = [
  { label: 'Total órdenes', key: 'total_orders', icon: ClipboardList },
  { label: 'Completadas', key: 'completed_this_month', icon: CheckCircle2 },
  { label: 'Demoradas', key: 'delayed', icon: TimerOff },
  { label: 'SLA vencido', key: 'sla_breached', icon: AlertTriangle },
  { label: 'SLA crítico', key: 'sla_critical', icon: ShieldAlert }
] as const satisfies { label: string; key: keyof DashboardKpis; icon: LucideIcon }[];

export function KpiCards({ data, loading }: { data: DashboardKpis | null; loading: boolean }) {
  const router = useRouter();
  return (
    <ErrorBoundary>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {defs.map((d) => {
          const value = data?.[d.key];
          const numericValue = typeof value === 'number' ? value : 0;
          const emphasize = (d.key === 'sla_breached' || d.key === 'sla_critical') && numericValue > 0;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => {
                if (d.key === 'sla_breached' || d.key === 'sla_critical' || d.key === 'delayed') router.push('/orders?delayed=true');
              }}
            >
              <Card className={emphasize ? 'border-red-500/70' : ''}>
                <div className="flex items-center justify-between text-[var(--text-secondary)]"><span className="text-sm">{d.label}</span><d.icon size={16} className={emphasize ? 'text-red-400' : ''} /></div>
                {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className={`mt-2 text-3xl font-bold ${emphasize ? 'text-red-400' : ''}`}>{numericValue}</p>}
              </Card>
            </button>
          );
        })}
      </div>
    </ErrorBoundary>
  );
}
