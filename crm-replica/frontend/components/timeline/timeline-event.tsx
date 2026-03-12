import { RelativeTime } from '@/components/common/relative-time';
import { Avatar } from '@/components/ui/avatar';

export type TimelineEvent = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  at: string;
};

export function TimelineEventItem({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex items-start gap-2 rounded-[8px] border border-[var(--border)] p-3 text-sm">
      <Avatar name={event.actor} />
      <div>
        <p><span className="font-medium">{event.actor}</span> {event.action} <span className="font-medium">{event.entity}</span></p>
        <p className="text-xs text-[var(--text-secondary)]"><RelativeTime value={event.at} /></p>
      </div>
    </div>
  );
}
