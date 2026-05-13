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
        <Card><h2 className="text-lg font-semibold">Ranking de fallas (catálogo)</h2><ul className="mt-2 text-sm">{stats.top_failures_catalog?.map((row: any) => <li key={row.id}>{row.failure_type} · freq {row.usage_count} · solución: {row.recommended_solution}</li>)}</ul></Card>
        <Card><h2 className="text-lg font-semibold">Distribución por resolución</h2><ul className="mt-2 text-sm">{stats.resolution_distribution?.map((row: any) => <li key={row.resolution_type}>{row.resolution_type} ({row._count?._all ?? 0})</li>)}</ul></Card>
        <Card><h2 className="text-lg font-semibold">Tendencia de recurrencia</h2><ul className="mt-2 text-sm">{stats.recurrence_trends?.map((row: any) => <li key={row.period}>{row.period}: {row.count}</li>)}</ul></Card>
      </>
    )}
  </div>;
}
