'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { TableSkeleton } from '@/components/common/skeletons';
import { useMapData } from '@/modules/map/hooks/use-map-data';
import { MapView } from '@/modules/map/components/map-view';

export default function MapPage() {
  const { orders, users, loading } = useMapData();

  return (
    <div className="space-y-4">
      <PageHeader title="Mapa" description="Vista operativa de técnicos y órdenes activas por ubicación." />
      {loading ? <TableSkeleton rows={8} cols={4} /> : <MapView orders={orders} users={users} />}
      <Card>
        <p className="text-sm text-[var(--text-secondary)]">Esta versión inicial simula una vista geográfica con paneles de ubicación, sin dependencias externas de mapas.</p>
      </Card>
    </div>
  );
}
