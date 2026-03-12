import { TimelineEvent, TimelineEventItem } from '@/components/timeline/timeline-event';

export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-[var(--text-secondary)]">Sin actividad registrada.</p>;
  return <div className="space-y-2">{events.map((event) => <TimelineEventItem key={event.id} event={event} />)}</div>;
}
