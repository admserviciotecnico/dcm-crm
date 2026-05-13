'use client';

import { useEffect, useState } from 'react';
import { FailuresApi } from '@/lib/api/endpoints';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';

export default function FailuresAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { FailuresApi.stats().then(setStats).catch(() => setStats(null)); }, []);

  return <div className="space-y-4">
    <PageHeader title="Analytics de fallas" description="Conocimiento técnico reutilizable: tipo de falla, causa raíz y solución." />
    {!stats ? <Card><p className="text-sm text-[var(--text-secondary)]">Cargando...</p></Card> : (
      <>
        <Card><h2 className="text-lg font-semibold">Top fallas</h2><ul className="mt-2 text-sm">{stats.top_failure_types?.map((row: any) => <li key={row.failure_type}>{row.failure_type} ({row._count?._all ?? 0})</li>)}</ul></Card>
        <Card><h2 className="text-lg font-semibold">Distribución por resolución</h2><ul className="mt-2 text-sm">{stats.resolution_distribution?.map((row: any) => <li key={row.resolution_type}>{row.resolution_type} ({row._count?._all ?? 0})</li>)}</ul></Card>
      </>
    )}
  </div>;
}
