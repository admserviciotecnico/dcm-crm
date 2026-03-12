'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Download, Filter, Plus } from 'lucide-react';
import { ClientsApi, OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { ServiceOrder, User, OrderStatus } from '@/types/domain';
import { OrdersTable } from '@/components/orders/orders-table';
import { OrderDetail } from '@/components/orders/order-detail';
import { useRealtime } from '@/hooks/use-realtime';
import { useDebouncedValue } from '@/hooks/use-debounced';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { EmptyState } from '@/components/common/empty-state';

const schema = z.object({
  client_id: z.string().min(1),
  estado: z.string().min(1),
  prioridad: z.enum(['alta', 'media', 'baja']),
  fecha_programada: z.string().min(1),
  technician_ids: z.string().optional(),
  direccion_service: z.string().min(1),
  observaciones: z.string().optional()
});

type OrderForm = z.infer<typeof schema>;

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
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const [filters, setFilters] = useState({ status: '', priority: '', client: '', technician: '', from: '', to: '', delayed: '' });
  const debounced = useDebouncedValue(filters, 300);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<OrderForm>({ resolver: zodResolver(schema), defaultValues: { estado: 'presupuesto_generado', prioridad: 'media' } });

  const setFilter = useCallback((key: keyof typeof filters, value: string) => setFilters((prev) => ({ ...prev, [key]: value })), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: 1, pageSize: 100 };
      Object.entries(debounced).forEach(([k, v]) => { if (v) params[k] = v; });
      const [ordersRes, usersRes, clientsRes] = await Promise.all([OrdersApi.list(params), UsersApi.list(), ClientsApi.list()]);
      const onlyAssigned = user?.role === 'tecnico' ? ordersRes.items.filter((o) => (o.technicians ?? []).some((t) => t.technician_id === user.id)) : ordersRes.items;
      setOrders(onlyAssigned);
      setUsers(usersRes);
      setClients(clientsRes.map((c) => ({ id: c.id, nombre_empresa: c.nombre_empresa })));
    } finally {
      setLoading(false);
    }
  }, [debounced, user?.id, user?.role]);

  useEffect(() => { void load(); }, [load]);
  useRealtime(load);

  const activeFilters = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);

  const onCreate = async (data: OrderForm) => {
    await OrdersApi.create({
      client_id: data.client_id,
      estado: data.estado,
      prioridad: data.prioridad,
      fecha_programada: data.fecha_programada,
      direccion_service: data.direccion_service,
      observaciones: data.observaciones,
      technician_ids: data.technician_ids ? data.technician_ids.split(',').map((id) => id.trim()) : []
    });
    toast({ type: 'success', message: 'Orden creada con éxito' });
    setShowCreate(false);
    reset();
    void load();
  };

  const toggleSelect = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  const toggleSelectAll = () => setSelectedIds((prev) => (prev.length === orders.length ? [] : orders.map((o) => o.id)));

  const bulkChangeStatus = async () => {
    await Promise.all(selectedIds.map((id) => OrdersApi.patch(id, { estado: bulkStatus })));
    toast({ type: 'success', message: 'Estado actualizado en selección' });
    setSelectedIds([]);
    void load();
  };

  const bulkAssignTech = async () => {
    if (!bulkTechnician) return;
    await Promise.all(selectedIds.map((id) => OrdersApi.assignTechnicians(id, [bulkTechnician])));
    toast({ type: 'success', message: 'Técnico asignado en selección' });
    setSelectedIds([]);
    void load();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Órdenes de Servicio</h1>
        {user?.role === 'admin' ? <Button onClick={() => setShowCreate(true)}><Plus size={15} /> Nueva Orden</Button> : null}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Buscar por cliente o ID..." className="max-w-sm" onChange={(e) => setFilter('client', e.target.value)} />
          <div className="relative">
            <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}><Filter size={14} /> Filtros</Button>
            {activeFilters > 0 ? <Badge className="absolute -right-2 -top-2 border-blue-400 bg-blue-600 text-white">{activeFilters}</Badge> : null}
          </div>
          <Button variant="secondary" onClick={exportCsv}><Download size={14} /> Exportar CSV</Button>
        </div>
        {showFilters ? (
          <div className="mt-3 grid gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-4 md:grid-cols-6">
            <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}><option value="">Estado</option><option value="service_programado">Programado</option><option value="en_ejecucion">En ejecución</option><option value="completado">Completado</option></Select>
            <Select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}><option value="">Prioridad</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></Select>
            <Select value={filters.client} onChange={(e) => setFilter('client', e.target.value)}><option value="">Cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}</Select>
            <Select value={filters.technician} onChange={(e) => setFilter('technician', e.target.value)}><option value="">Técnico</option>{users.filter((u) => u.role === 'tecnico').map((u) => <option key={u.id} value={u.id}>{u.first_name}</option>)}</Select>
            <Input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
            <div className="flex items-center gap-2"><Input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} /><Button variant="ghost" onClick={() => setFilter('delayed', filters.delayed ? '' : 'true')}><CalendarDays size={14} /> Demorados</Button></div>
          </div>
        ) : null}
      </Card>

      {selectedIds.length > 0 ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{selectedIds.length} seleccionadas</Badge>
            <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as OrderStatus)} className="max-w-52">
              <option value="service_programado">service_programado</option>
              <option value="en_ejecucion">en_ejecucion</option>
              <option value="completado">completado</option>
              <option value="cancelado">cancelado</option>
            </Select>
            <Button onClick={bulkChangeStatus}>Cambiar estado</Button>
            <Select value={bulkTechnician} onChange={(e) => setBulkTechnician(e.target.value)} className="max-w-52"><option value="">Asignar técnico</option>{users.filter((u) => u.role === 'tecnico').map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</Select>
            <Button variant="secondary" onClick={bulkAssignTech}>Asignar técnico</Button>
            <Button variant="ghost" onClick={exportCsv}>Exportar selección</Button>
          </div>
        </Card>
      ) : null}

      {loading ? <Card>Cargando órdenes...</Card> : orders.length === 0 ? <EmptyState variant="orders" title="No hay órdenes" subtitle="Crea tu primera orden para iniciar la operación." /> : <OrdersTable rows={orders} users={users} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} onClick={setSelected} onStatusQuickChange={async (order, status) => { await OrdersApi.patch(order.id, { estado: status }); toast({ type: 'success', message: `Orden ${order.id.slice(0, 6)} actualizada` }); void load(); }} />}
      <OrderDetail order={selected} users={users} onClose={() => setSelected(null)} onRefresh={load} />

      <Modal open={showCreate} title="Crear nueva orden" onClose={() => setShowCreate(false)}>
        <form className="grid gap-2" onSubmit={handleSubmit(onCreate)}>
          <Select {...register('client_id')}><option value="">Cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}</Select>
          <Select {...register('estado')}><option value="presupuesto_generado">presupuesto_generado</option><option value="service_programado">service_programado</option></Select>
          <Select {...register('prioridad')}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></Select>
          <Input type="date" {...register('fecha_programada')} />
          <Input placeholder="IDs técnicos separados por coma" {...register('technician_ids')} />
          <Input placeholder="Dirección" {...register('direccion_service')} />
          <Input placeholder="Observaciones" {...register('observaciones')} />
          <div className="mt-2 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button><Button disabled={isSubmitting} type="submit">Guardar</Button></div>
        </form>
      </Modal>
    </div>
  );
}
