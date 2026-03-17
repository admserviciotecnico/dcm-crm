'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ClientsApi, EquipmentsApi, EventsApi, OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { Client, Equipment, EventLog, ServiceOrder, User } from '@/types/domain';
import { appStore } from '@/stores/app-store';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { RelativeTime } from '@/components/common/relative-time';
import { EmptyState } from '@/components/common/empty-state';
import { CardSkeleton, TableSkeleton } from '@/components/common/skeletons';
import { PageHeader } from '@/components/layout/page-header';
import { ActivityTimeline } from '@/components/timeline/activity-timeline';
import { OrderDetail } from '@/components/orders/order-detail';
import { FileUploader } from '@/modules/documents/components/file-uploader';
import { FileList } from '@/modules/documents/components/file-list';
import { useDocumentsState } from '@/modules/documents/hooks/use-documents-state';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';

type TabKey = 'resumen' | 'historial' | 'órdenes' | 'documentos' | 'actividad';

function normalizeStatus(status?: string) {
  const value = status === 'revision' ? 'en_revision' : status;
  return value ?? 'operativo';
}

function parseDateValue(value?: string): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function statusBadgeClass(status: string) {
  if (status === 'operativo') return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  if (status === 'mantenimiento') return 'border-amber-200 bg-amber-100 text-amber-700';
  if (status === 'fuera_servicio') return 'border-red-200 bg-red-100 text-red-700';
  return 'border-blue-200 bg-blue-100 text-blue-700';
}

export default function Equipment360Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = appStore((s) => s.pushToast);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('resumen');
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [search, setSearch] = useState('');
  const [backendEvents, setBackendEvents] = useState<EventLog[]>([]);

  const { docs, add, remove } = useDocumentsState('equipment', id);

  const load = async () => {
    setLoading(true);
    try {
      const [equipments, clients, ordersRes, usersRes] = await Promise.all([
        EquipmentsApi.list(),
        ClientsApi.list(),
        OrdersApi.list({ page: 1, pageSize: 500 }),
        UsersApi.list()
      ]);
      const eq = equipments.find((e) => e.id === id) ?? null;
      setEquipment(eq);
      setClient(eq ? clients.find((c) => c.id === eq.client_id) ?? null : null);
      const related = eq ? ordersRes.items.filter((o) => (o.observaciones ?? '').includes(eq.id) || (o.observaciones ?? '').toLowerCase().includes(eq.numero_serie.toLowerCase())) : [];
      setOrders(related.sort((a, b) => (parseDateValue(b.fecha_programada) ?? 0) - (parseDateValue(a.fecha_programada) ?? 0)));
      setUsers(usersRes);
      try {
        const ev = await EventsApi.list({ entityType: 'equipment', entityId: id, limit: 200 });
        setBackendEvents(ev);
      } catch {
        setBackendEvents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const openOrders = orders.filter((o) => o.estado !== 'completado' && o.estado !== 'cancelado');
  const lastService = orders.find((o) => parseDateValue(o.fecha_programada) !== null);
  const daysSinceLast = lastService?.fecha_programada
    ? (() => {
      const timestamp = parseDateValue(lastService.fecha_programada);
      return timestamp === null ? null : Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
    })()
    : null;

  const tabItems = [
    'resumen',
    `historial (${orders.length + docs.length + 2})`,
    `órdenes (${orders.length})`,
    `documentos (${docs.length})`,
    `actividad (${orders.length + docs.length + 2})`
  ];
  const tabValue = tabItems.find((item) => item.startsWith(tab)) ?? tabItems[0];

  const filteredOrders = useMemo(() => orders.filter((o) => {
    const text = [o.id, o.estado, o.prioridad].join(' ').toLowerCase();
    return search.trim() ? text.includes(search.toLowerCase()) : true;
  }), [orders, search]);

  const techNames = (order: ServiceOrder) => (order.technicians ?? []).map((t) => {
    const user = users.find((u) => u.id === t.technician_id);
    return user ? `${user.first_name} ${user.last_name}` : t.technician_id;
  });

  const backendTimelineEvents = useMemo(() => backendEvents.map((event) => ({
    id: event.id,
    actor: event.actor_user_id ?? 'Sistema',
    action: event.event_type.replace('_', ' '),
    entity: event.message,
    at: event.created_at,
    href: event.entity_type === 'order' && event.entity_id ? `/orders/${event.entity_id}` : event.entity_type === 'equipment' && event.entity_id ? `/equipments/${event.entity_id}` : event.entity_type === 'client' && event.entity_id ? `/clients/${event.entity_id}` : undefined
  })), [backendEvents]);

  if (loading) {
    return <div className="space-y-4"><CardSkeleton /><div className="grid gap-3 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}</div><TableSkeleton rows={6} cols={7} /></div>;
  }

  if (!equipment) return <EmptyState variant="equipments" title="Equipo no encontrado" subtitle="No se encontró el activo solicitado." />;

  const normalizedStatus = normalizeStatus(equipment.estado_actual);
  const location = equipment.ubicacion_planta;
  const installedAt = equipment.fecha_instalacion
    ? new Date(equipment.fecha_instalacion).toLocaleDateString()
    : undefined;
  const technicalNotes = equipment.observaciones;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-[var(--text-secondary)]">Equipos / {equipment.tipo_equipo}</p>
        <PageHeader
          title={`${equipment.tipo_equipo} · ${equipment.modelo ?? '-'}`}
          description={`Serie ${equipment.numero_serie} • ${client?.nombre_empresa ?? equipment.client_id}`}
          action={<><Button variant="secondary" onClick={() => router.push('/equipments')}>Editar equipo</Button><Button onClick={() => router.push('/orders')}>Nueva orden</Button><Button variant="secondary" onClick={() => router.push(`/clients/${equipment.client_id}`)}>Ver cliente</Button><Button variant="secondary" onClick={() => setTab('documentos')}>Agregar documento</Button></>}
        />
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div><p className="text-[var(--text-secondary)]">N° Serie</p><p className="mono">{equipment.numero_serie}</p></div>
          <div><p className="text-[var(--text-secondary)]">Estado</p><Badge className={statusBadgeClass(normalizedStatus)}>{normalizedStatus.replace('_', ' ')}</Badge></div>
          <div><p className="text-[var(--text-secondary)]">Cliente</p><Link href={`/clients/${equipment.client_id}`} className="text-blue-300 hover:underline">{client?.nombre_empresa ?? equipment.client_id}</Link></div>
          <div><p className="text-[var(--text-secondary)]">Ubicación</p><p>{location ?? '-'}</p></div>
          <div><p className="text-[var(--text-secondary)]">Fecha instalación</p><p>{installedAt ?? '-'}</p></div>
          <div><p className="text-[var(--text-secondary)]">Última orden</p>{lastService ? <Link href={`/orders/${lastService.id}`} className="text-blue-300 hover:underline">#{lastService.id.slice(0, 8)}</Link> : '-'}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>Órdenes totales: {orders.length}</Badge>
          <Badge>Órdenes abiertas: {openOrders.length}</Badge>
          <Badge>Último servicio: {lastService?.fecha_programada ? new Date(lastService.fecha_programada).toLocaleDateString() : 'N/D'}</Badge>
          <Badge>Documentos: {docs.length}</Badge>
          <Badge>Días desde último servicio: {daysSinceLast ?? 'N/D'}</Badge>
        </div>
      </Card>

      <div className="sticky top-20 z-20 bg-[var(--bg-app)] py-2">
        <Tabs items={tabItems} value={tabValue} onChange={(value) => setTab((value.split(' (')[0] as TabKey) ?? 'resumen')} />
      </div>

      {tab === 'resumen' ? (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-medium">Información general</h2>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div><p className="text-[var(--text-secondary)]">Tipo</p><p>{equipment.tipo_equipo}</p></div>
              <div><p className="text-[var(--text-secondary)]">Modelo</p><p>{equipment.modelo ?? '-'}</p></div>
              <div><p className="text-[var(--text-secondary)]">Número de serie</p><p className="mono">{equipment.numero_serie}</p></div>
              <div><p className="text-[var(--text-secondary)]">Estado</p><Badge className={statusBadgeClass(normalizedStatus)}>{normalizedStatus.replace('_', ' ')}</Badge></div>
              <div><p className="text-[var(--text-secondary)]">Ubicación</p><p>{location ?? '-'}</p></div>
              <div><p className="text-[var(--text-secondary)]">Observaciones</p><p>{technicalNotes ?? '-'}</p></div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-medium">Órdenes recientes</h2>
            {orders.length === 0 ? <EmptyState variant="orders" title="Sin órdenes" subtitle="Este equipo todavía no tiene órdenes relacionadas." /> : (
              <Table>
                <thead><tr><th>ID</th><th>Estado</th><th>Prioridad</th><th>Técnicos</th><th>Fecha</th></tr></thead>
                <tbody>
                  {orders.slice(0, 5).map((o) => <tr key={o.id} className="cursor-pointer" onClick={() => setSelectedOrder(o)}><td className="mono">#{o.id.slice(0, 8)}</td><td><StatusBadge value={o.estado} /></td><td><PriorityBadge value={o.prioridad} /></td><td>{techNames(o).length === 0 ? '-' : techNames(o).slice(0, 2).map((name) => <span key={`${o.id}-${name}`} className="mr-1 inline-flex items-center gap-1"><Avatar name={name} className="h-5 w-5" />{name}</span>)}</td><td><RelativeTime value={o.fecha_programada} /></td></tr>)}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-medium">Documentos recientes</h2>
            <FileList docs={docs.slice(0, 5)} onRemove={async (docId) => { const result = await remove(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} />
          </Card>
        </div>
      ) : null}

      {tab === 'historial' ? (
        <Card>
          <h2 className="mb-3 text-lg font-medium">Historial técnico</h2>
          {backendTimelineEvents.length === 0 ? <EmptyState variant="default" title="Sin actividad" subtitle="No hay eventos registrados para este equipo todavía." /> : <ActivityTimeline events={backendTimelineEvents} />}
        </Card>
      ) : null}

      {tab === 'órdenes' ? (
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-lg font-medium">Órdenes relacionadas</h2><Input className="max-w-sm" placeholder="Buscar por ID, estado o prioridad" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          {filteredOrders.length === 0 ? <EmptyState variant="orders" title="Sin resultados" subtitle="No hay órdenes para el criterio indicado." /> : (
            <Table>
              <thead><tr><th>ID</th><th>Cliente</th><th>Estado</th><th>Prioridad</th><th>Técnicos</th><th>Fecha programada</th><th>Demorado</th></tr></thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="cursor-pointer" onClick={() => setSelectedOrder(o)}>
                    <td className="mono">#{o.id.slice(0, 8)}</td>
                    <td>{o.client?.nombre_empresa ?? o.client_id}</td>
                    <td><StatusBadge value={o.estado} /></td>
                    <td><PriorityBadge value={o.prioridad} /></td>
                    <td>{techNames(o).slice(0, 2).join(', ') || '-'}</td>
                    <td><RelativeTime value={o.fecha_programada} /></td>
                    <td>{o.delayed ? <Badge className="border-red-200 bg-red-100 text-red-700">Sí</Badge> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}

      {tab === 'documentos' ? (
        <Card>
          <h2 className="text-lg font-medium">Documentos</h2>
          <div className="my-3"><FileUploader onAdd={async (name, category) => { const result = await add(name, category); if (result.ok) toast({ type: 'success', message: 'Documento agregado al equipo' }); else if (result.reason === 'duplicate') toast({ type: 'info', message: 'Documento duplicado para este equipo' }); else toast({ type: 'error', message: 'Nombre de documento inválido' }); }} /></div>
          {docs.length === 0 ? <EmptyState title="Sin documentos" subtitle="Subí manuales, informes y evidencias del activo." /> : (
            <div className="space-y-3">
              <FileList docs={docs.filter((d) => d.category === 'contract')} onRemove={async (docId) => { const result = await remove(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} title="Manual técnico" hideWhenEmpty />
              <FileList docs={docs.filter((d) => d.category === 'report')} onRemove={async (docId) => { const result = await remove(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} title="Informes de servicio" hideWhenEmpty />
              <FileList docs={docs.filter((d) => d.category === 'photo')} onRemove={async (docId) => { const result = await remove(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} title="Fotografías" hideWhenEmpty />
              <FileList docs={docs.filter((d) => d.category === 'other')} onRemove={async (docId) => { const result = await remove(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} title="Hojas técnicas / certificados" hideWhenEmpty />
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'actividad' ? (
        <Card>
          <h2 className="mb-3 text-lg font-medium">Actividad</h2>
          {backendTimelineEvents.length === 0 ? <EmptyState variant="default" title="Sin actividad" subtitle="No hay eventos registrados para este equipo todavía." /> : <ActivityTimeline events={backendTimelineEvents} />}
        </Card>
      ) : null}

      <OrderDetail order={selectedOrder} users={users} onClose={() => setSelectedOrder(null)} onRefresh={load} />
    </div>
  );
}
