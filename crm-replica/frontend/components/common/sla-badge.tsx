import { Badge } from '@/components/ui/badge';
import { SlaStatus } from '@/types/domain';

const styles: Record<SlaStatus, string> = {
  ok: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  warning: 'border-amber-200 bg-amber-100 text-amber-700',
  critical: 'border-orange-200 bg-orange-100 text-orange-700',
  breached: 'border-red-200 bg-red-100 text-red-700',
  met: 'border-[var(--border)] bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
};

function getHoursLeft(slaDeadline?: string | null) {
  if (!slaDeadline) return null;
  const deadline = new Date(slaDeadline);
  if (Number.isNaN(deadline.getTime())) return null;
  return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (60 * 60 * 1000)));
}

export function SlaBadge({ status, slaDeadline }: { status?: SlaStatus; slaDeadline?: string | null }) {
  const value = status ?? 'ok';
  const hoursLeft = getHoursLeft(slaDeadline);

  if (value === 'met') return <Badge className={styles.met}>Completado</Badge>;
  if (value === 'breached') return <Badge className={styles.breached}>SLA vencido</Badge>;
  if (value === 'critical') return <Badge className={styles.critical}>SLA &lt;1h</Badge>;
  if (value === 'warning') return <Badge className={styles.warning}>SLA ~{hoursLeft ?? 0}h</Badge>;
  return <Badge className={styles.ok}>SLA OK</Badge>;
}
