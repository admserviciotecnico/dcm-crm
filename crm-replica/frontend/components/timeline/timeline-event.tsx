import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { RelativeTime } from '@/components/common/relative-time';
import { Avatar } from '@/components/ui/avatar';

export type TimelineEvent = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  at: string;
  href?: string;
};

export function TimelineEventItem({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex items-start gap-2 rounded-[8px] border border-[var(--border)] p-3 text-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]">
      <Avatar name={event.actor} />
      <div className="min-w-0 flex-1">
        <p><span className="font-medium">{event.actor}</span> {event.action} <span className="font-medium">{event.entity}</span></p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--text-secondary)]"><RelativeTime value={event.at} /></p>
          {event.href ? <Link href={event.href} className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">Abrir <ExternalLink size={12} /></Link> : null}
        </div>
      </div>
    </div>
  );
}
