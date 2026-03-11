'use client';

import { useMemo, useState } from 'react';
import { appStore } from '@/stores/app-store';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Select } from '@/components/ui/select';
import { RelativeTime } from '@/components/common/relative-time';

type TypeFilter = 'all' | 'creacion' | 'estado' | 'completado' | 'cancelado';
type DateFilter = 'today' | 'week' | 'month';

export default function ActivityPage() {
  const notifications = appStore((s) => s.notifications);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  const feed = useMemo(() => notifications.map((n) => ({ ...n, actor: 'Sistema' })), [notifications]);

  const filtered = useMemo(() => feed.filter((item) => {
    const text = `${item.title} ${item.message}`.toLowerCase();
    const created = new Date(item.createdAt).getTime();
    const now = Date.now();
    const dateOk = dateFilter === 'today' ? created >= now - 86400000 : dateFilter === 'week' ? created >= now - 7 * 86400000 : created >= now - 30 * 86400000;
    const typeOk = typeFilter === 'all' || (typeFilter === 'creacion' && text.includes('cre')) || (typeFilter === 'estado' && text.includes('estado')) || (typeFilter === 'completado' && text.includes('complet')) || (typeFilter === 'cancelado' && text.includes('cancel'));
    return dateOk && typeOk;
  }), [feed, typeFilter, dateFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Activity Feed</h1><div className="flex gap-2"><Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}><option value="all">Todos</option><option value="creacion">Creación</option><option value="estado">Cambio de estado</option><option value="completado">Completado</option><option value="cancelado">Cancelado</option></Select><Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}><option value="today">Hoy</option><option value="week">Última semana</option><option value="month">Último mes</option></Select></div></div>
      <Card>
        <div className="space-y-2">
          {filtered.length === 0 ? <p className="text-sm text-slate-400">Sin actividad para los filtros seleccionados.</p> : filtered.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded border border-slate-700 p-3">
              <Avatar name={item.actor} />
              <div>
                <p className="text-sm"><span className="font-semibold">{item.actor}</span> · {item.title}</p>
                <p className="text-sm text-slate-300">{item.message}</p>
                <p className="text-xs text-slate-500"><RelativeTime value={item.createdAt} /></p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
