'use client';

import { useEffect, useMemo, useState } from 'react';
import { EventsApi } from '@/lib/api/endpoints';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { ActivityTimeline } from '@/components/timeline/activity-timeline';
import { TableSkeleton } from '@/components/common/skeletons';
import { TimelineEvent } from '@/components/timeline/timeline-event';
import { EventLog } from '@/types/domain';

type TypeFilter = 'all' | 'order' | 'client' | 'equipment' | 'document' | 'system';
type DateFilter = 'today' | 'week' | 'month';
type FeedEvent = TimelineEvent & { type: Exclude<TypeFilter, 'all'> };

function hrefFromEvent(event: EventLog) {
  if (!event.entity_id) return undefined;
  if (event.entity_type === 'order') return `/orders/${event.entity_id}`;
  if (event.entity_type === 'client') return `/clients/${event.entity_id}`;
  if (event.entity_type === 'equipment') return `/equipments/${event.entity_id}`;
  return undefined;
}

function mapEventLog(event: EventLog): FeedEvent {
  return {
    id: event.id,
    type: event.entity_type,
    actor: event.actor_user_id ?? 'Sistema',
    action: event.event_type.replace('_', ' '),
    entity: event.message,
    at: event.created_at,
    href: hrefFromEvent(event)
  };
}

export default function ActivityPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const backendEvents = await EventsApi.list({ limit: 300 });
        setEvents(backendEvents.map(mapEventLog));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const filtered = useMemo(() => events.filter((item) => {
    const created = new Date(item.at).getTime();
    const now = Date.now();
    const dateOk = dateFilter === 'today' ? created >= now - 86400000 : dateFilter === 'week' ? created >= now - 7 * 86400000 : created >= now - 30 * 86400000;
    const typeOk = typeFilter === 'all' || item.type === typeFilter;
    return dateOk && typeOk;
  }), [events, typeFilter, dateFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity Feed"
        description="Timeline global de órdenes, clientes, equipos y documentos."
        action={<div className="flex gap-2"><Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}><option value="all">Todas las entidades</option><option value="order">Órdenes</option><option value="client">Clientes</option><option value="equipment">Equipos</option><option value="document">Documentos</option><option value="system">Sistema</option></Select><Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}><option value="today">Hoy</option><option value="week">Última semana</option><option value="month">Último mes</option></Select></div>}
      />
      <Card>
        {loading ? <TableSkeleton rows={6} cols={1} /> : <ActivityTimeline events={filtered} />}
      </Card>
    </div>
  );
}
