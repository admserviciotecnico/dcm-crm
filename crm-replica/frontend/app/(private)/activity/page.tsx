'use client';

import { useMemo, useState } from 'react';
import { appStore } from '@/stores/app-store';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { ActivityTimeline } from '@/components/timeline/activity-timeline';

type TypeFilter = 'all' | 'creacion' | 'estado' | 'completado' | 'cancelado';
type DateFilter = 'today' | 'week' | 'month';

export default function ActivityPage() {
  const notifications = appStore((s) => s.notifications);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  const events = useMemo(() => notifications.map((n) => ({
    id: n.id,
    actor: 'Sistema',
    action: n.title,
    entity: n.message,
    at: n.createdAt
  })), [notifications]);

  const filtered = useMemo(() => events.filter((item) => {
    const text = `${item.action} ${item.entity}`.toLowerCase();
    const created = new Date(item.at).getTime();
    const now = Date.now();
    const dateOk = dateFilter === 'today' ? created >= now - 86400000 : dateFilter === 'week' ? created >= now - 7 * 86400000 : created >= now - 30 * 86400000;
    const typeOk = typeFilter === 'all' || (typeFilter === 'creacion' && text.includes('cre')) || (typeFilter === 'estado' && text.includes('estado')) || (typeFilter === 'completado' && text.includes('complet')) || (typeFilter === 'cancelado' && text.includes('cancel'));
    return dateOk && typeOk;
  }), [events, typeFilter, dateFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity Feed"
        description="Timeline global de colaboración interna y cambios operativos."
        action={<div className="flex gap-2"><Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}><option value="all">Todos</option><option value="creacion">Creación</option><option value="estado">Cambio de estado</option><option value="completado">Completado</option><option value="cancelado">Cancelado</option></Select><Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}><option value="today">Hoy</option><option value="week">Última semana</option><option value="month">Último mes</option></Select></div>}
      />
      <Card>
        <ActivityTimeline events={filtered} />
      </Card>
    </div>
  );
}
