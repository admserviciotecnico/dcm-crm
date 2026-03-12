'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useEquipments } from '@/hooks/useEquipments';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/card';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { ActivityTimeline } from '@/components/timeline/activity-timeline';
import { PageHeader } from '@/components/layout/page-header';

export default function EquipmentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { equipments } = useEquipments();
  const { orders } = useOrders({ page: 1, pageSize: 300 });

  const equipment = useMemo(() => equipments.find((e) => e.id === id), [equipments, id]);
  const serviceHistory = useMemo(() => orders.filter((o) => (o.observaciones ?? '').includes(id)), [orders, id]);
  const events = useMemo(() => serviceHistory.map((o) => ({ id: o.id, actor: 'Sistema', action: `actualizó orden #${o.id.slice(0, 8)}`, entity: `${o.estado}`, at: o.fecha_programada || new Date().toISOString() })), [serviceHistory]);

  return (
    <div className="space-y-4">
      <Card>
        <PageHeader title={equipment?.tipo_equipo ?? 'Equipo'} description={`Serie: ${equipment?.numero_serie ?? '-'}`} />
        <p className="mono text-sm text-slate-300">Serie: {equipment?.numero_serie ?? '-'}</p>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Historial de servicios</h2>
        <Timeline>
          {serviceHistory.map((o) => <TimelineItem key={o.id} title={`${o.fecha_programada ? new Date(o.fecha_programada).toISOString() : '-'} · Orden #${o.id.slice(0, 8)}`} subtitle={`Tipo de servicio: ${o.estado} · Estado final: ${o.estado}`} />)}
        </Timeline>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Actividad relacionada</h2>
        <ActivityTimeline events={events} />
      </Card>
    </div>
  );
}
