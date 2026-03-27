'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ClientsApi, EquipmentsApi, OrdersApi } from '@/lib/api/endpoints';
import { Equipment, ServiceOrder } from '@/types/domain';
import { appStore } from '@/stores/app-store';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/common/skeletons';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { ErrorBoundary } from '@/components/common/error-boundary';

const schema = z.object({
  client_id: z.string().min(1, 'Cliente requerido'),
  tipo_equipo: z.string().min(1, 'Tipo requerido'),
  modelo: z.string().min(1, 'Modelo requerido'),
  numero_serie: z.string().min(1, 'Número de serie requerido'),
  ubicacion: z.string().optional(),
  observaciones: z.string().optional(),
  fecha_instalacion: z.string().optional(),
  estado_actual: z.enum(['operativo', 'mantenimiento', 'fuera_servicio', 'en_revision'])
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;

function normalizeStatus(status: string) {
  return status === 'revision' ? 'en_revision' : status;
}

function parseDateValue(value?: string) {
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

export default function EquipmentsPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<{ id: string; nombre_empresa: string }[]>([]);
  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [edit, setEdit] = useState<Equipment | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const toast = appStore((s) => s.pushToast);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const q = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { estado_actual: 'operativo', modelo: '' }
  });
  const selectedClientId = watch('client_id') ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eqs, cs, ordersRes] = await Promise.all([
        EquipmentsApi.listPage({ page, pageSize: PAGE_SIZE, q: q || undefined, status: statusFilter || undefined, sortBy, sortDir }),
        ClientsApi.list(),
        OrdersApi.list({ page: 1, pageSize: 500 })
      ]);
      setItems(eqs.items);
      setTotal(eqs.total);
      setClients(cs.map((c) => ({ id: c.id, nombre_empresa: c.nombre_empresa })));
      setOrders(ordersRes.items);
    } finally {
      setLoading(false);
    }
  }, [page, q, sortBy, sortDir, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const getRelatedOrders = (eq: Equipment) => orders.filter((o) => (o.observaciones ?? '').includes(eq.id) || (o.observaciones ?? '').toLowerCase().includes(eq.numero_serie.toLowerCase()));

  const onSubmit = async (data: FormData) => {
    const duplicatedSerial = items.find((equipment) => equipment.numero_serie.toLowerCase() === data.numero_serie.toLowerCase() && equipment.id !== edit?.id);
    if (duplicatedSerial) {
      toast({ type: 'info', message: 'Ya existe un equipo con ese número de serie' });
      return;
    }

    try {
      const payload = { client_id: data.client_id, tipo_equipo: data.tipo_equipo, modelo: data.modelo, numero_serie: data.numero_serie, ubicacion_planta: data.ubicacion?.trim() || undefined, observaciones: data.observaciones?.trim() || undefined, fecha_instalacion: data.fecha_instalacion ? new Date(data.fecha_instalacion).toISOString() : undefined, estado_actual: data.estado_actual };
      if (edit) await EquipmentsApi.update(edit.id, payload); else await EquipmentsApi.create(payload);
      toast({ type: 'success', message: edit ? 'Equipo actualizado' : 'Equipo creado' });
      setOpen(false); setEdit(null); reset();
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo guardar el equipo') });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const toggleSort = (field: string) => setParams({ sortBy: field, sortDir: sortBy === field && sortDir === 'asc' ? 'desc' : 'asc', page: '1' });
  const sortIndicator = (field: string) => sortBy === field ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null;

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <PageHeader title="Equipos instalados" description="Vista operativa de activos con estado, contexto de cliente y último servicio." action={<Button onClick={() => { setEdit(null); reset({ estado_actual: 'operativo', modelo: '' }); setOpen(true); }}>Nuevo equipo</Button>} />

        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar por tipo, modelo, serie o cliente" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="max-w-md" />
          <Select value={statusFilter} onChange={(e) => setParams({ status: e.target.value || null, page: '1' })}>
            <option value="">Todos los estados</option>
<option value="operativo">Operativo</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="fuera_servicio">Fuera de servicio</option>
<option value="en_revision">En revisión</option>
          </Select>
        </div>

        {loading ? <TableSkeleton rows={8} cols={8} /> : !items.length ? <EmptyState variant="equipments" title="No hay equipos" subtitle="Asociá equipos a clientes y gestioná su ciclo de vida técnico." /> : (
          <>
            <Table>
              <thead className="text-left text-xs uppercase text-[var(--text-secondary)]">
<tr>
<th className="p-2">
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('tipo_equipo')}>Tipo {sortIndicator('tipo_equipo')}</button>
</th>
<th className="p-2">
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('modelo')}>Modelo {sortIndicator('modelo')}</button>
</th>
<th className="p-2">
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('numero_serie')}>N° Serie {sortIndicator('numero_serie')}</button>
</th>
<th className="p-2">Cliente</th>
<th className="p-2">Ubicación</th>
<th className="p-2">
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('estado_actual')}>Estado {sortIndicator('estado_actual')}</button>
</th>
<th className="p-2">Órdenes abiertas</th>
<th className="p-2">Último servicio</th>
<th className="p-2" />
</tr>
</thead>
              <tbody>{items.map((eq) => { const relatedOrders = getRelatedOrders(eq); const openOrders = relatedOrders.filter((o) => o.estado !== 'completado' && o.estado !== 'cancelado').length; const latestService = [...relatedOrders].sort((a, b) => (parseDateValue(b.fecha_programada) ?? 0) - (parseDateValue(a.fecha_programada) ?? 0))[0]; const status = normalizeStatus(eq.estado_actual); return <tr key={eq.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-surface-hover)]">
<td className="p-2">
<Link className="text-blue-300 hover:underline" href={`/equipments/${eq.id}`}>{eq.tipo_equipo}</Link>
</td>
<td className="p-2">{eq.modelo ?? '-'}</td>
<td className="mono p-2">{eq.numero_serie}</td>
<td className="p-2">{clients.find((c) => c.id === eq.client_id)?.nombre_empresa ?? eq.client_id}</td>
<td className="p-2">{eq.ubicacion_planta ?? '-'}</td>
<td className="p-2">
<Badge className={statusBadgeClass(status)}>{status.replace('_', ' ')}</Badge>
</td>
<td className="p-2">{openOrders}</td>
<td className="p-2">{latestService?.fecha_programada ? new Date(latestService.fecha_programada).toLocaleDateString() : '-'}</td>
<td className="p-2">
<div className="flex gap-2">
<Button variant="ghost" onClick={() => { setEdit(eq); reset({ client_id: eq.client_id, tipo_equipo: eq.tipo_equipo, modelo: eq.modelo ?? '', numero_serie: eq.numero_serie, ubicacion: eq.ubicacion_planta ?? '', observaciones: eq.observaciones ?? '', fecha_instalacion: eq.fecha_instalacion ? new Date(eq.fecha_instalacion).toISOString().slice(0, 10) : '', estado_actual: normalizeStatus(eq.estado_actual) as FormData['estado_actual'] }); setOpen(true); }}>Editar</Button>
<Button variant="danger" onClick={() => setToDelete(eq)}>Eliminar</Button>
</div>
</td>
</tr>; })}</tbody>
            </Table>
            <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm">
<p>Total: {total} equipos · Página {page} de {totalPages}</p>
<div className="flex gap-2">
<Button variant="secondary" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Anterior</Button>
<Button variant="secondary" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1) })}>Siguiente</Button>
</div>
</div>
          </>
        )}

        <Modal open={open} title={edit ? 'Editar equipo' : 'Nuevo equipo'} onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div>
<p className="mb-1 text-xs text-[var(--text-secondary)]">Cliente</p>
<SearchableSelect options={clients.map((c) => ({ value: c.id, label: c.nombre_empresa }))} value={selectedClientId} onChange={(value) => setValue('client_id', value, { shouldDirty: true, shouldValidate: true })} placeholder="Buscar cliente por nombre" emptyMessage="No hay clientes coincidentes" />
<input type="hidden" {...register('client_id')} />{errors.client_id ? <p className="text-xs text-red-400">{errors.client_id.message}</p> : null}</div>
            <div className="grid gap-2 md:grid-cols-2">
<div>
<p className="mb-1 text-xs text-[var(--text-secondary)]">Tipo de equipo</p>
<Input {...register('tipo_equipo')} />{errors.tipo_equipo ? <p className="text-xs text-red-400">{errors.tipo_equipo.message}</p> : null}</div>
<div>
<p className="mb-1 text-xs text-[var(--text-secondary)]">Modelo</p>
<Input {...register('modelo')} />{errors.modelo ? <p className="text-xs text-red-400">{errors.modelo.message}</p> : null}</div>
<div>
<p className="mb-1 text-xs text-[var(--text-secondary)]">Número de serie</p>
<Input {...register('numero_serie')} />{errors.numero_serie ? <p className="text-xs text-red-400">{errors.numero_serie.message}</p> : null}</div>
<div>
<p className="mb-1 text-xs text-[var(--text-secondary)]">Estado</p>
<Select {...register('estado_actual')}>
<option value="operativo">Operativo</option>
<option value="mantenimiento">Mantenimiento</option>
<option value="fuera_servicio">Fuera de servicio</option>
<option value="en_revision">En revisión</option>
</Select>
</div>
<div className="md:col-span-2">
<p className="mb-1 text-xs text-[var(--text-secondary)]">Ubicación</p>
<Input {...register('ubicacion')} placeholder="Planta / sector" />
</div>
<div>
<p className="mb-1 text-xs text-[var(--text-secondary)]">Fecha de instalación</p>
<Input type="date" {...register('fecha_instalacion')} />
</div>
<div className="md:col-span-2">
<p className="mb-1 text-xs text-[var(--text-secondary)]">Observaciones</p>
<Input {...register('observaciones')} placeholder="Notas operativas" />
</div>
</div>
            <div className="flex justify-end">
<Button type="submit">Guardar</Button>
</div>
          </form>
        </Modal>

        <ConfirmModal open={!!toDelete} title="Eliminar equipo" message={toDelete ? `Se realizará un soft delete del equipo ${toDelete.tipo_equipo} serie ${toDelete.numero_serie}. Esto puede impactar órdenes relacionadas y trazabilidad histórica.` : ''} onCancel={() => { if (!deleteLoading) setToDelete(null); }} onConfirm={async () => { if (!toDelete) return; setDeleteLoading(true); try { await EquipmentsApi.remove(toDelete.id); toast({ type: 'info', message: 'Equipo eliminado' }); setToDelete(null); await load(); } catch (error) { toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo eliminar el equipo') }); } finally { setDeleteLoading(false); } }} confirmDisabled={deleteLoading} cancelDisabled={deleteLoading} />
      </div>
    </ErrorBoundary>
  );
}
