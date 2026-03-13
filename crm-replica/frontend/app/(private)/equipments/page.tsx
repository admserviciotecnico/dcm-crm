'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClientsApi, EquipmentsApi, OrdersApi } from '@/lib/api/endpoints';
import { Equipment, ServiceOrder } from '@/types/domain';
import { getEquipmentMetaMap, setEquipmentMeta } from '@/lib/equipment-meta';
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

const schema = z.object({
  client_id: z.string().min(1, 'Cliente requerido'),
  tipo_equipo: z.string().min(1, 'Tipo requerido'),
  modelo: z.string().min(1, 'Modelo requerido'),
  numero_serie: z.string().min(1, 'Número de serie requerido'),
  ubicacion: z.string().optional(),
  observaciones: z.string().optional(),
  estado_actual: z.enum(['operativo', 'mantenimiento', 'fuera_servicio', 'en_revision'])
});

type FormData = z.infer<typeof schema>;

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
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<{ id: string; nombre_empresa: string }[]>([]);
  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [edit, setEdit] = useState<Equipment | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [metaMap, setMetaMap] = useState<Record<string, { location?: string; installedAt?: string; notes?: string }>>({});
  const [clientQuery, setClientQuery] = useState('');
  const [clientOpen, setClientOpen] = useState(false);
  const toast = appStore((s) => s.pushToast);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { estado_actual: 'operativo', modelo: '' }
  });
  const selectedClientId = watch('client_id') ?? '';

  const load = async () => {
    setLoading(true);
    try {
      const [eqs, cs, ordersRes] = await Promise.all([EquipmentsApi.list(), ClientsApi.list(), OrdersApi.list({ page: 1, pageSize: 500 })]);
      setItems(eqs);
      setClients(cs.map((c) => ({ id: c.id, nombre_empresa: c.nombre_empresa })));
      setOrders(ordersRes.items);
      setMetaMap(getEquipmentMetaMap());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const getRelatedOrders = (eq: Equipment) => orders.filter((o) => (o.observaciones ?? '').includes(eq.id) || (o.observaciones ?? '').toLowerCase().includes(eq.numero_serie.toLowerCase()));

  const filteredItems = useMemo(() => items.filter((eq) => {
    const clientName = clients.find((c) => c.id === eq.client_id)?.nombre_empresa ?? '';
    const meta = metaMap[eq.id];
    const status = normalizeStatus(eq.estado_actual);
    const text = [eq.tipo_equipo, eq.modelo ?? '', eq.numero_serie, clientName, meta?.location ?? '', status].join(' ').toLowerCase();
    const searchOk = search.trim() ? text.includes(search.toLowerCase()) : true;
    const statusOk = statusFilter ? status === statusFilter : true;
    return searchOk && statusOk;
  }), [items, clients, metaMap, search, statusFilter]);


  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.nombre_empresa.toLowerCase().includes(q));
  }, [clientQuery, clients]);

  useEffect(() => {
    const current = clients.find((c) => c.id === selectedClientId);
    if (current) setClientQuery(current.nombre_empresa);
  }, [clients, selectedClientId]);

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        client_id: data.client_id,
        tipo_equipo: data.tipo_equipo,
        modelo: data.modelo,
        numero_serie: data.numero_serie,
        estado_actual: data.estado_actual
      };
      let targetId = edit?.id;
      if (edit) {
        await EquipmentsApi.update(edit.id, payload);
      } else {
        const created = await EquipmentsApi.create(payload) as Partial<Equipment>;
        targetId = created.id;
      }
      await load();

      if (!targetId) {
        const match = items.find((e) => e.numero_serie === data.numero_serie);
        targetId = match?.id;
      }
      if (targetId) {
        setEquipmentMeta(targetId, { location: data.ubicacion?.trim(), notes: data.observaciones?.trim() });
        setMetaMap(getEquipmentMetaMap());
      }

      toast({ type: 'success', message: edit ? 'Equipo actualizado' : 'Equipo creado' });
      setOpen(false); setClientOpen(false); setEdit(null); reset();
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo guardar el equipo') });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Equipos instalados"
        description="Vista operativa de activos con estado, contexto de cliente y último servicio."
        action={<Button onClick={() => { setEdit(null); reset({ estado_actual: 'operativo', modelo: '' }); setClientQuery(''); setOpen(true); }}>Nuevo equipo</Button>}
      />

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar por tipo, modelo, serie o cliente" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="operativo">Operativo</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="fuera_servicio">Fuera de servicio</option>
          <option value="en_revision">En revisión</option>
        </Select>
      </div>

      {loading ? <TableSkeleton rows={8} cols={8} /> : null}

      {!loading && !filteredItems.length ? <EmptyState variant="equipments" title="No hay equipos" subtitle="Asociá equipos a clientes y gestioná su ciclo de vida técnico." /> : null}

      {!loading && filteredItems.length > 0 ? (
        <Table>
          <thead className="text-left text-xs uppercase text-[var(--text-secondary)]"><tr><th className="p-2">Tipo</th><th className="p-2">Modelo</th><th className="p-2">N° Serie</th><th className="p-2">Cliente</th><th className="p-2">Ubicación</th><th className="p-2">Estado</th><th className="p-2">Órdenes abiertas</th><th className="p-2">Último servicio</th><th className="p-2" /></tr></thead>
          <tbody>
            {filteredItems.map((eq) => {
              const relatedOrders = getRelatedOrders(eq);
              const openOrders = relatedOrders.filter((o) => o.estado !== 'completado' && o.estado !== 'cancelado').length;
              const latestService = [...relatedOrders].sort((a, b) => (parseDateValue(b.fecha_programada) ?? 0) - (parseDateValue(a.fecha_programada) ?? 0))[0];
              const status = normalizeStatus(eq.estado_actual);
              return (
                <tr key={eq.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-surface-hover)]">
                  <td className="p-2"><Link className="text-blue-300 hover:underline" href={`/equipments/${eq.id}`}>{eq.tipo_equipo}</Link></td>
                  <td className="p-2">{eq.modelo ?? '-'}</td>
                  <td className="mono p-2">{eq.numero_serie}</td>
                  <td className="p-2">{clients.find((c) => c.id === eq.client_id)?.nombre_empresa ?? eq.client_id}</td>
                  <td className="p-2">{metaMap[eq.id]?.location ?? '-'}</td>
                  <td className="p-2"><Badge className={statusBadgeClass(status)}>{status.replace('_', ' ')}</Badge></td>
                  <td className="p-2">{openOrders}</td>
                  <td className="p-2">{latestService?.fecha_programada ? new Date(latestService.fecha_programada).toLocaleDateString() : '-'}</td>
                  <td className="p-2"><div className="flex gap-2"><Button variant="ghost" onClick={() => { setEdit(eq); reset({ client_id: eq.client_id, tipo_equipo: eq.tipo_equipo, modelo: eq.modelo ?? '', numero_serie: eq.numero_serie, ubicacion: metaMap[eq.id]?.location ?? '', observaciones: metaMap[eq.id]?.notes ?? '', estado_actual: normalizeStatus(eq.estado_actual) as FormData['estado_actual'] }); setClientQuery(clients.find((c) => c.id === eq.client_id)?.nombre_empresa ?? ''); setOpen(true); }}>Editar</Button><Button variant="danger" onClick={() => setToDelete(eq)}>Eliminar</Button></div></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : null}

      <Modal open={open} title={edit ? 'Editar equipo' : 'Nuevo equipo'} onClose={() => { setOpen(false); setClientOpen(false); }}>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div className="relative">
            <p className="mb-1 text-xs text-[var(--text-secondary)]">Cliente</p>
            <SearchableSelect
              options={clients.map((c) => ({ value: c.id, label: c.nombre_empresa }))}
              value={selectedClientId}
              onChange={(value) => setValue('client_id', value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Buscar cliente por nombre"
              emptyMessage="No hay clientes coincidentes"
            />
            <input type="hidden" {...register('client_id')} />
            {errors.client_id ? <p className="text-xs text-red-400">{errors.client_id.message}</p> : null}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div><p className="mb-1 text-xs text-[var(--text-secondary)]">Tipo de equipo</p><Input {...register('tipo_equipo')} />{errors.tipo_equipo ? <p className="text-xs text-red-400">{errors.tipo_equipo.message}</p> : null}</div>
            <div><p className="mb-1 text-xs text-[var(--text-secondary)]">Modelo</p><Input {...register('modelo')} />{errors.modelo ? <p className="text-xs text-red-400">{errors.modelo.message}</p> : null}</div>
            <div><p className="mb-1 text-xs text-[var(--text-secondary)]">Número de serie</p><Input {...register('numero_serie')} />{errors.numero_serie ? <p className="text-xs text-red-400">{errors.numero_serie.message}</p> : null}</div>
            <div><p className="mb-1 text-xs text-[var(--text-secondary)]">Estado</p><Select {...register('estado_actual')}><option value="operativo">Operativo</option><option value="mantenimiento">Mantenimiento</option><option value="fuera_servicio">Fuera de servicio</option><option value="en_revision">En revisión</option></Select></div>
            <div className="md:col-span-2"><p className="mb-1 text-xs text-[var(--text-secondary)]">Ubicación</p><Input {...register('ubicacion')} placeholder="Planta / sector" /></div>
            <div className="md:col-span-2"><p className="mb-1 text-xs text-[var(--text-secondary)]">Observaciones</p><Input {...register('observaciones')} placeholder="Notas operativas" /></div>
          </div>
          <div className="flex justify-end"><Button type="submit">Guardar</Button></div>
        </form>
      </Modal>

      <ConfirmModal open={!!toDelete} title="Eliminar equipo" message="Se realizará soft delete." onCancel={() => setToDelete(null)} onConfirm={async () => { if (!toDelete) return; try { await EquipmentsApi.remove(toDelete.id); toast({ type: 'info', message: 'Equipo eliminado' }); } catch (error) { toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo eliminar el equipo') }); } setToDelete(null); await load(); }} />
    </div>
  );
}
