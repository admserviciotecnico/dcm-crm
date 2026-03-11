'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
 codex/fix-cors-error-in-backend-izagw1
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

 main
import { useClients } from '@/hooks/useClients';
import { useEquipments } from '@/hooks/useEquipments';
import { useOrders } from '@/hooks/useOrders';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
 codex/fix-cors-error-in-backend-izagw1
import { Tooltip } from '@/components/ui/tooltip';
import { RelativeTime } from '@/components/common/relative-time';

 main

export default function Client360Page() {
  const { id } = useParams<{ id: string }>();
  const { clients } = useClients();
  const { equipments } = useEquipments();
  const { orders } = useOrders({ page: 1, pageSize: 200 });
  const [tab, setTab] = useState('equipos');

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id]);
  const clientEquipments = useMemo(() => equipments.filter((e) => e.client_id === id), [equipments, id]);
  const clientOrders = useMemo(() => orders.filter((o) => o.client_id === id), [orders, id]);

 codex/fix-cors-error-in-backend-izagw1
  const expiryIndicator = useMemo(() => {
    const date = client?.fecha_vencimiento_documentacion;
    if (!date) return <span className="text-slate-400">Sin fecha de vencimiento</span>;
    const d = new Date(date);
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (days < 0) return <span className="inline-flex items-center gap-1 text-xs text-red-300"><AlertTriangle size={12} /> Vencido {formatDistanceToNow(d, { addSuffix: true, locale: es })}</span>;
    if (days < 30) return <span className="inline-flex items-center gap-1 text-xs text-amber-300"><Clock size={12} /> Vence {formatDistanceToNow(d, { addSuffix: true, locale: es })}</span>;
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle size={12} /> <Tooltip label={d.toISOString()}>{d.toISOString().slice(0, 10)}</Tooltip></span>;
  }, [client?.fecha_vencimiento_documentacion]);


 main
  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-2xl font-bold">{client?.nombre_empresa ?? 'Cliente'}</h1>
        <p className="text-sm text-slate-300">{client?.persona_contacto ?? '-'} · {client?.telefono ?? '-'} · {client?.email ?? '-'}</p>
 codex/fix-cors-error-in-backend-izagw1
        <div className="mt-2">{expiryIndicator}</div>

 main
      </Card>

      <Tabs items={['equipos', 'órdenes', 'documentación', 'actividad']} value={tab} onChange={setTab} />

      {tab === 'equipos' ? (
        <Table>
          <thead><tr><th className="p-2">Tipo</th><th className="p-2">Modelo</th><th className="p-2">Serie</th></tr></thead>
          <tbody>{clientEquipments.map((e) => <tr key={e.id} className="border-t border-slate-700"><td className="p-2"><Link href={`/equipments/${e.id}`}>{e.tipo_equipo}</Link></td><td className="p-2">{e.modelo ?? '-'}</td><td className="mono p-2">{e.numero_serie}</td></tr>)}</tbody>
        </Table>
      ) : null}

      {tab === 'órdenes' ? (
        <Table>
          <thead><tr><th className="p-2">ID</th><th className="p-2">Estado</th><th className="p-2">Fecha</th></tr></thead>
 codex/fix-cors-error-in-backend-izagw1
          <tbody>{clientOrders.map((o) => <tr key={o.id} className="border-t border-slate-700"><td className="mono p-2">#{o.id.slice(0, 8)}</td><td className="p-2">{o.estado}</td><td className="p-2"><RelativeTime value={o.fecha_programada} /></td></tr>)}</tbody>

          <tbody>{clientOrders.map((o) => <tr key={o.id} className="border-t border-slate-700"><td className="mono p-2">#{o.id.slice(0, 8)}</td><td className="p-2">{o.estado}</td><td className="p-2">{o.fecha_programada ? new Date(o.fecha_programada).toLocaleDateString() : '-'}</td></tr>)}</tbody>
 main
        </Table>
      ) : null}

      {tab === 'documentación' ? <Card><p className="text-sm text-slate-400">Documentación del cliente (simulada para frontend).</p></Card> : null}

      {tab === 'actividad' ? (
        <Card>
 codex/fix-cors-error-in-backend-izagw1
          <div className="space-y-2">{clientOrders.map((o) => <div key={o.id} className="rounded border border-slate-700 p-2 text-sm"><p>Orden #{o.id.slice(0, 8)} · {o.estado}</p><p className="text-xs text-slate-500"><RelativeTime value={o.fecha_programada} /></p></div>)}</div>

          <div className="space-y-2">{clientOrders.map((o) => <div key={o.id} className="rounded border border-slate-700 p-2 text-sm"><p>Orden #{o.id.slice(0, 8)} · {o.estado}</p><p className="text-xs text-slate-500">{o.fecha_programada ? new Date(o.fecha_programada).toLocaleString() : '-'}</p></div>)}</div>
 main
        </Card>
      ) : null}
    </div>
  );
}
