'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, ChevronDown, ChevronUp, Download, Filter, Plus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ClientsApi, OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { ServiceOrder, User, OrderStatus } from '@/types/domain';
import { OrdersTable } from '@/components/orders/orders-table';
import { OrderDetail } from '@/components/orders/order-detail';
import { useRealtime } from '@/hooks/use-realtime';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/common/skeletons';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { ORDER_STATUS_LABEL } from '@/constants/orderStatus';
import { ErrorBoundary } from '@/components/common/error-boundary';

const schema = z.object({
  client_id: z.string().min(1),
  estado: z.string().min(1),
  prioridad: z.enum(['alta', 'media', 'baja']),
  fecha_programada: z.string().min(1),
  technician_ids: z.array(z.string()).default([]),
  direccion_service: z.string().min(1),
  observaciones: z.string().optional()
});

type OrderForm = z.infer<typeof schema>;
const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<{ id: string; nombre_empresa: string }[]>([]);
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>('service_programado');
  const [bulkTechnician, setBulkTechnician] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [total, setTotal] = useState(0);
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const q = searchParams.get('q') || '';
  const sortBy = searchParams.get('sortBy') || 'updated_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const filters = useMemo(() => ({ status: searchParams.get('status') || '', priority: searchParams.get('priority') || '', client: searchParams.get('client') || '', technician: searchParams.get('technician') || '', from: searchParams.get('from') || '', to: searchParams.get('to') || '', delayed: searchParams.get('delayed') || '' }), [searchParams]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<OrderForm>({ resolver: zodResolver(schema), defaultValues: { estado: 'presupuesto_generado', prioridad: 'media' } });

  const setParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => { setSearchInput(q); }, [q]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (searchInput !== q) setParams({ q: searchInput || null, page: '1' });
    }, 300);
    return () => window.clearTimeout(id);
  }, [q, searchInput, setParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize: PAGE_SIZE, sortBy, sortDir };
      if (q) params.q = q;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const [ordersRes, usersRes, clientsRes] = await Promise.all([OrdersApi.list(params), UsersApi.list(), ClientsApi.list()]);
      setOrders(ordersRes.items);
      setTotal(ordersRes.total);
      setUsers(usersRes);
      setClients(clientsRes.map((c) => ({ id: c.id, nombre_empresa: c.nombre_empresa })));
    } finally {
      setLoading(false);
    }
  }, [filters, page, q, sortBy, sortDir]);

  useEffect(() => { void load(); }, [load]);
  useRealtime(load);

  const activeFilters = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onCreate = async (data: OrderForm) => {
    try {
      await OrdersApi.create({ client_id: data.client_id, estado: data.estado, prioridad: data.prioridad, fecha_programada: data.fecha_programada, direccion_service: data.direccion_service, observaciones: data.observaciones, technicians: data.technician_ids });
      toast({ type: 'success', message: 'Orden creada con éxito' });
      setShowCreate(false);
      reset();
      void load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo crear la orden') });
    }
  };

  const toggleSelect = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  const toggleSelectAll = () => setSelectedIds((prev) => (prev.length === orders.length ? [] : orders.map((o) => o.id)));
  const toggleSort = (field: string) => setParams({ sortBy: field, sortDir: sortBy === field && sortDir === 'asc' ? 'desc' : 'asc', page: '1' });
  const sortIndicator = (field: string) => sortBy === field ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null;

  const bulkChangeStatus = async () => {
    try {
      await Promise.all(selectedIds.map((id) => OrdersApi.patch(id, { estado: bulkStatus })));
      toast({ type: 'success', message: 'Estado actualizado en selección' });
      setSelectedIds([]);
      void load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo actualizar el estado en selección') });
    }
  };

  const bulkAssignTech = async () => {
    if (!bulkTechnician) return;
    try {
      await Promise.all(selectedIds.map((id) => OrdersApi.assignTechnicians(id, [bulkTechnician])));
      toast({ type: 'success', message: 'Técnico asignado en selección' });
      setSelectedIds([]);
      void load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo asignar técnico en selección') });
    }
  };

  const exportCsv = () => {
    const rows = orders.filter((o) => selectedIds.length === 0 || selectedIds.includes(o.id));
    const csv = ['id,cliente,estado,prioridad,fecha', ...rows.map((o) => `${o.id},${o.client?.nombre_empresa ?? o.client_id},${o.estado},${o.prioridad},${o.fecha_programada ?? ''}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <PageHeader title="Órdenes de Servicio" description="Gestioná, filtrá y ejecutá órdenes de campo desde un único panel." action={user?.role === 'admin' ? <Button onClick={() => setShowCreate(true)}>
<Plus size={16} /> Nueva Orden</Button> : null} />
        <Card>
          <div className="flex flex-wrap items-center gap-2">
<Input placeholder="Buscar por cliente, ID o dirección..." value={searchInput} className="max-w-sm" onChange={(e) => setSearchInput(e.target.value)} />
<div className="relative">
<Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
<Filter size={14} /> Filtros</Button>{activeFilters > 0 ? <Badge className="absolute -right-2 -top-2 border-blue-400 bg-blue-600 text-white">{activeFilters}</Badge> : null}</div>
<Button variant="secondary" onClick={exportCsv}>
<Download size={14} /> Exportar CSV</Button>
</div>
          {showFilters ? <div className="mt-3 grid gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-4 md:grid-cols-6">
<Select value={filters.status} onChange={(e) => setParams({ status: e.target.value || null, page: '1' })}>
<option value="">Estado</option>{(Object.entries(ORDER_STATUS_LABEL) as [OrderStatus, string][]).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</Select>
<Select value={filters.priority} onChange={(e) => setParams({ priority: e.target.value || null, page: '1' })}>
<option value="">Prioridad</option>
<option value="alta">Alta</option>
<option value="media">Media</option>
<option value="baja">Baja</option>
</Select>
<Select value={filters.client} onChange={(e) => setParams({ client: e.target.value || null, page: '1' })}>
<option value="">Cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}</Select>
<Select value={filters.technician} onChange={(e) => setParams({ technician: e.target.value || null, page: '1' })}>
<option value="">Técnico</option>{users.filter((u) => u.role === 'tecnico').map((u) => <option key={u.id} value={u.id}>{u.first_name}</option>)}</Select>
<Input type="date" value={filters.from} onChange={(e) => setParams({ from: e.target.value || null, page: '1' })} />
<div className="flex items-center gap-2">
<Input type="date" value={filters.to} onChange={(e) => setParams({ to: e.target.value || null, page: '1' })} />
<Button variant="ghost" onClick={() => setParams({ delayed: filters.delayed ? null : 'true', page: '1' })}>
<CalendarDays size={14} /> Demorados</Button>
</div>
</div> : null}
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('fecha_programada')}>Ordenar por fecha {sortIndicator('fecha_programada')}</button>
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('estado')}>Estado {sortIndicator('estado')}</button>
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('prioridad')}>Prioridad {sortIndicator('prioridad')}</button>
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('created_at')}>Creación {sortIndicator('created_at')}</button>
</div>
        </Card>

        {selectedIds.length > 0 ? <Card className="sticky top-20 z-20">
<div className="flex flex-wrap items-center gap-2">
<Badge>{selectedIds.length} seleccionadas</Badge>
<Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as OrderStatus)} className="max-w-52">{(['service_programado', 'en_ejecucion', 'completado', 'cancelado'] as OrderStatus[]).map((status) => <option key={status} value={status}>{ORDER_STATUS_LABEL[status]}</option>)}</Select>
<Button onClick={bulkChangeStatus}>Cambiar estado</Button>
<Select value={bulkTechnician} onChange={(e) => setBulkTechnician(e.target.value)} className="max-w-52">
<option value="">Asignar técnico</option>{users.filter((u) => u.role === 'tecnico').map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</Select>
<Button variant="secondary" onClick={bulkAssignTech}>Asignar técnico</Button>
<Button variant="ghost" onClick={exportCsv}>Exportar selección</Button>
</div>
</Card> : null}

        {loading ? <TableSkeleton rows={8} cols={8} /> : orders.length === 0 ? <EmptyState variant="orders" title="No hay órdenes" subtitle="Crea tu primera orden para iniciar la operación." /> : <>
<OrdersTable rows={orders} users={users} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} onClick={setSelected} onStatusQuickChange={async (order, status) => { try { await OrdersApi.patch(order.id, { estado: status }); toast({ type: 'success', message: `Orden ${order.id.slice(0, 6)} actualizada` }); void load(); } catch (error) { toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo actualizar la orden') }); } }} />
<div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm">
<p>Total: {total} órdenes · Página {page} de {totalPages}</p>
<div className="flex gap-2">
<Button variant="secondary" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Anterior</Button>
<Button variant="secondary" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1) })}>Siguiente</Button>
</div>
</div>
</>}
        <OrderDetail order={selected} users={users} onClose={() => setSelected(null)} onRefresh={load} />

        <Modal open={showCreate} title="Crear nueva orden" onClose={() => setShowCreate(false)}>
          <form className="grid gap-2" onSubmit={handleSubmit(onCreate)}>
            <div className="space-y-1">
<label className="text-xs text-[var(--text-secondary)]">Cliente</label>
<Select {...register('client_id')}>
<option value="">Cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}</Select>
</div>
            <div className="space-y-1">
<label className="text-xs text-[var(--text-secondary)]">Estado</label>
<Select {...register('estado')}>{(['presupuesto_generado', 'service_programado'] as OrderStatus[]).map((status) => <option key={status} value={status}>{ORDER_STATUS_LABEL[status]}</option>)}</Select>
</div>
            <div className="space-y-1">
<label className="text-xs text-[var(--text-secondary)]">Prioridad</label>
<Select {...register('prioridad')}>
<option value="alta">Alta</option>
<option value="media">Media</option>
<option value="baja">Baja</option>
</Select>
</div>
            <div className="space-y-1">
<label className="text-xs text-[var(--text-secondary)]">Fecha programada</label>
<Input type="date" {...register('fecha_programada')} />
</div>
            <div className="space-y-1">
<label className="text-xs text-[var(--text-secondary)]">Técnicos asignados</label>
<div className="max-h-32 space-y-2 overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-3">{users.filter((listedUser) => listedUser.role === 'tecnico').map((technician) => <label key={technician.id} className="flex items-center gap-2 text-sm">
<input type="checkbox" value={technician.id} {...register('technician_ids')} />
<span>{technician.first_name} {technician.last_name}</span>
</label>)}</div>
</div>
            <div className="space-y-1">
<label className="text-xs text-[var(--text-secondary)]">Dirección</label>
<Input placeholder="Dirección" {...register('direccion_service')} />
</div>
            <div className="space-y-1">
<label className="text-xs text-[var(--text-secondary)]">Observaciones</label>
<Input placeholder="Observaciones" {...register('observaciones')} />
</div>
            <div className="mt-2 flex justify-end gap-2">
<Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
<Button disabled={isSubmitting} type="submit">Guardar</Button>
</div>
          </form>
        </Modal>
      </div>
    </ErrorBoundary>
  );
}
