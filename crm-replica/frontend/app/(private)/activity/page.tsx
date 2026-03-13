'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClientsApi, EquipmentsApi, OrdersApi } from '@/lib/api/endpoints';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { ActivityTimeline } from '@/components/timeline/activity-timeline';
import { TableSkeleton } from '@/components/common/skeletons';
import { readDocumentEvents } from '@/modules/documents/hooks/use-documents-state';
import { TimelineEvent } from '@/components/timeline/timeline-event';

type TypeFilter = 'all' | 'order' | 'client' | 'equipment' | 'document';
type DateFilter = 'today' | 'week' | 'month';
type FeedEvent = TimelineEvent & { type: Exclude<TypeFilter, 'all'> };

export default function ActivityPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [ordersRes, clients, equipments] = await Promise.all([
          OrdersApi.list({ page: 1, pageSize: 300 }),
          ClientsApi.list(),
          EquipmentsApi.list()
        ]);

        const orderEvents: FeedEvent[] = ordersRes.items.flatMap((o) => {
          const baseAt = o.fecha_programada ?? new Date().toISOString();
          return [
            { id: `order-created-${o.id}`, type: 'order', actor: 'Sistema', action: 'creó orden', entity: `#${o.id.slice(0, 8)} · ${o.client?.nombre_empresa ?? o.client_id}`, at: baseAt, href: `/orders/${o.id}` },
            { id: `order-updated-${o.id}`, type: 'order', actor: 'Sistema', action: 'actualizó orden', entity: `#${o.id.slice(0, 8)} · ${o.estado}`, at: baseAt, href: `/orders/${o.id}` },
            ...(o.estado === 'completado' ? [{ id: `order-completed-${o.id}`, type: 'order' as const, actor: 'Sistema', action: 'completó orden', entity: `#${o.id.slice(0, 8)}`, at: baseAt, href: `/orders/${o.id}` }] : [])
          ];
        });

        const clientEvents: FeedEvent[] = clients.map((c) => ({
          id: `client-created-${c.id}`,
          type: 'client',
          actor: 'Sistema',
          action: 'registró cliente',
          entity: c.nombre_empresa,
          at: c.fecha_vencimiento_documentacion ?? new Date().toISOString(),
          href: `/clients/${c.id}`
        }));

        const equipmentEvents: FeedEvent[] = equipments.map((e) => ({
          id: `equipment-created-${e.id}`,
          type: 'equipment',
          actor: 'Sistema',
          action: 'registró equipo',
          entity: `${e.tipo_equipo} · ${e.numero_serie}`,
          at: new Date().toISOString(),
          href: `/equipments/${e.id}`
        }));

        const documentEvents: FeedEvent[] = readDocumentEvents().map((event) => ({
          id: `document-${event.id}`,
          type: 'document',
          actor: 'Sistema',
          action: event.action === 'added' ? 'agregó documento' : 'eliminó documento',
          entity: `${event.documentName} (${event.entityType})`,
          at: event.createdAt,
          href: event.entityType === 'order' ? `/orders/${event.entityId}` : event.entityType === 'client' ? `/clients/${event.entityId}` : `/equipments/${event.entityId}`
        }));

        const deduped = [...orderEvents, ...clientEvents, ...equipmentEvents, ...documentEvents].reduce<Record<string, FeedEvent>>((acc, ev) => {
          acc[ev.id] = ev;
          return acc;
        }, {});

        setEvents(Object.values(deduped).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()));
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
        action={<div className="flex gap-2"><Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}><option value="all">Todas las entidades</option><option value="order">Órdenes</option><option value="client">Clientes</option><option value="equipment">Equipos</option><option value="document">Documentos</option></Select><Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}><option value="today">Hoy</option><option value="week">Última semana</option><option value="month">Último mes</option></Select></div>}
      />
      <Card>
        {loading ? <TableSkeleton rows={6} cols={1} /> : <ActivityTimeline events={filtered} />}
      </Card>
    </div>
  );
}
