'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useEquipments } from '@/hooks/useEquipments';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/card';
import { Timeline, TimelineItem } from '@/components/ui/timeline';

export default function EquipmentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { equipments } = useEquipments();
  const { orders } = useOrders({ page: 1, pageSize: 300 });

  const equipment = useMemo(() => equipments.find((e) => e.id === id), [equipments, id]);
  const serviceHistory = useMemo(() => orders.filter((o) => (o.observaciones ?? '').includes(id)), [orders, id]);

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold">{equipment?.tipo_equipo ?? 'Equipo'}</h1>
        <p className="mono text-sm text-slate-300">Serie: {equipment?.numero_serie ?? '-'}</p>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Historial de servicios</h2>
        <Timeline>
 codex/fix-cors-error-in-backend-izagw1
          {serviceHistory.map((o) => <TimelineItem key={o.id} title={`${o.fecha_programada ? new Date(o.fecha_programada).toISOString() : '-'} · Orden #${o.id.slice(0, 8)}`} subtitle={`Tipo de servicio: ${o.estado} · Estado final: ${o.estado}`} />)}

          {serviceHistory.map((o) => <TimelineItem key={o.id} title={`${o.fecha_programada ? new Date(o.fecha_programada).toLocaleDateString() : '-'} · Orden #${o.id.slice(0, 8)}`} subtitle={`Tipo de servicio: ${o.estado} · Estado final: ${o.estado}`} />)}
 main
        </Timeline>
      </Card>
    </div>
  );
}
