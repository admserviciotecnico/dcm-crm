'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Clock, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClientsApi } from '@/lib/api/endpoints';
import { Client } from '@/types/domain';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Dropdown } from '@/components/ui/dropdown';
import { ClientContact, getPrimaryContact, parseClientObservaciones, serializeClientObservaciones } from '@/lib/client-contacts';
import { PageHeader } from '@/components/layout/page-header';
import { FormSkeleton, TableSkeleton } from '@/components/common/skeletons';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';

const contactSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  apellido: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  area: z.string().optional()
}).refine((value) => Boolean(value.email?.trim() || value.telefono?.trim()), {
  message: 'Completá email o teléfono',
  path: ['email']
});

const schema = z.object({
  nombre_empresa: z.string().min(1, 'Requerido'),
  direccion: z.string().optional(),
  persona_contacto: z.string().optional(),
  fecha_vencimiento_documentacion: z.string().optional(),
  observaciones: z.string().optional(),
  contacts: z.array(contactSchema).min(1, 'Debe existir al menos un contacto')
});

type FormData = z.infer<typeof schema>;

const emptyContact: FormData['contacts'][number] = { nombre: '', apellido: '', email: '', telefono: '', area: '' };
const PAGE_SIZE = 10;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [queryInput, setQueryInput] = useState('');
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [edit, setEdit] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = appStore((s) => s.pushToast);

  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const expiredOnly = searchParams.get('expired') === '1';
  const currentQ = searchParams.get('q') || '';

  const setParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => { setQueryInput(currentQ); }, [currentQ]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (queryInput !== currentQ) setParams({ q: queryInput || null, page: '1' });
    }, 300);
    return () => window.clearTimeout(id);
  }, [currentQ, queryInput, setParams]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre_empresa: '', direccion: '', persona_contacto: '', fecha_vencimiento_documentacion: '', observaciones: '', contacts: [emptyContact] }
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ClientsApi.listPage({ page, pageSize: PAGE_SIZE, q: currentQ || undefined, sortBy, sortDir, expired: expiredOnly ? 1 : undefined });
      setClients(response.items);
      setTotal(response.total);
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron cargar los clientes') });
    } finally {
      setLoading(false);
    }
  }, [currentQ, expiredOnly, page, sortBy, sortDir, toast]);

  useEffect(() => { void load(); }, [load]);

  const mapClientToForm = (client: Client): FormData => {
    const parsed = parseClientObservaciones(client.observaciones);
    const primaryFromLegacy = client.persona_contacto?.trim() ?? '';
    const [legacyNombre, ...legacyRest] = primaryFromLegacy.split(' ').filter(Boolean);
    const legacyApellido = legacyRest.join(' ');
    const contacts = parsed.contacts.length > 0 ? parsed.contacts : [{ nombre: legacyNombre ?? '', apellido: legacyApellido ?? '', email: client.email ?? '', telefono: client.telefono ?? '', area: '' }];
    return { nombre_empresa: client.nombre_empresa, direccion: client.direccion ?? '', persona_contacto: client.persona_contacto ?? '', fecha_vencimiento_documentacion: client.fecha_vencimiento_documentacion ?? '', observaciones: parsed.observaciones, contacts: contacts.map((c) => ({ nombre: c.nombre ?? '', apellido: c.apellido ?? '', email: c.email ?? '', telefono: c.telefono ?? '', area: c.area ?? '' })) };
  };

  const onSubmit = async (data: FormData) => {
    try {
      const contacts: ClientContact[] = data.contacts.map((c) => ({ nombre: c.nombre.trim(), apellido: c.apellido.trim(), email: c.email?.trim() || undefined, telefono: c.telefono?.trim() || undefined, area: c.area?.trim() || undefined }));
      const primary = getPrimaryContact(contacts);
      const payload = { nombre_empresa: data.nombre_empresa, direccion: data.direccion, persona_contacto: primary ? `${primary.nombre} ${primary.apellido}`.trim() : data.persona_contacto, email: primary?.email || 'sin-email@cliente.local', telefono: primary?.telefono || '', fecha_vencimiento_documentacion: data.fecha_vencimiento_documentacion, observaciones: serializeClientObservaciones(contacts, data.observaciones ?? '') };
      if (edit) await ClientsApi.update(edit.id, payload);
      else await ClientsApi.create(payload);
      toast({ type: 'success', message: edit ? 'Cliente actualizado' : 'Cliente creado' });
      setOpen(false);
      setEdit(null);
      reset({ nombre_empresa: '', direccion: '', persona_contacto: '', fecha_vencimiento_documentacion: '', observaciones: '', contacts: [emptyContact] });
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo guardar el cliente') });
    }
  };

  const expiryCell = (date?: string) => {
    if (!date) return <span className="text-[var(--text-secondary)]">-</span>;
    const d = new Date(date);
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (days < 0) return <span className="inline-flex items-center gap-1 text-xs text-red-300">
<AlertTriangle size={12} /> <Tooltip label={d.toISOString()}>{`Vencido ${formatDistanceToNow(d, { addSuffix: true, locale: es })}`}</Tooltip>
</span>;
    if (days < 30) return <span className="inline-flex items-center gap-1 text-xs text-amber-300">
<Clock size={12} /> <Tooltip label={d.toISOString()}>{`Vence ${formatDistanceToNow(d, { addSuffix: true, locale: es })}`}</Tooltip>
</span>;
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
<CheckCircle size={12} /> <Tooltip label={d.toISOString()}>{d.toISOString().slice(0, 10)}</Tooltip>
</span>;
  };

  const readContacts = (client: Client) => {
    const parsed = parseClientObservaciones(client.observaciones);
    if (parsed.contacts.length > 0) return parsed.contacts;
    const fallbackName = client.persona_contacto?.trim() ?? '';
    const [nombre, ...rest] = fallbackName.split(' ').filter(Boolean);
    return [{ nombre: nombre ?? '-', apellido: rest.join(' '), email: client.email, telefono: client.telefono, area: '' }];
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const toggleSort = (field: string) => setParams({ sortBy: field, sortDir: sortBy === field && sortDir === 'asc' ? 'desc' : 'asc', page: '1' });
  const sortIndicator = (field: string) => sortBy === field ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null;

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <PageHeader title="Clientes industriales" description="Administrá cuentas, contactos y documentación de cada cliente." action={<div className="flex items-center gap-2">
<Input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="Buscar por empresa, contacto, email o teléfono" className="w-80" />
<Button variant="secondary" onClick={() => setParams({ expired: expiredOnly ? null : '1', page: '1' })}>{expiredOnly ? 'Ver todos' : 'Solo vencidos'}</Button>
<Button onClick={() => { setEdit(null); reset({ nombre_empresa: '', direccion: '', persona_contacto: '', fecha_vencimiento_documentacion: '', observaciones: '', contacts: [emptyContact] }); setOpen(true); }}>Nuevo cliente</Button>
</div>} />
        {loading ? <TableSkeleton rows={7} cols={7} /> : !clients.length ? <EmptyState variant="clients" title="No hay clientes" subtitle="Registra empresas para iniciar operaciones." /> : (
          <>
            <Table>
              <thead>
<tr>
<th>
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('nombre_empresa')}>Empresa {sortIndicator('nombre_empresa')}</button>
</th>
<th>Contacto</th>
<th>
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('email')}>Email {sortIndicator('email')}</button>
</th>
<th>Teléfono</th>
<th>
<button className="inline-flex items-center gap-1" onClick={() => toggleSort('fecha_vencimiento_documentacion')}>Vencimiento documentación {sortIndicator('fecha_vencimiento_documentacion')}</button>
</th>
<th>Estado</th>
<th />
</tr>
</thead>
              <tbody>
                {clients.map((c) => {
                  const contacts = readContacts(c);
                  const primary = contacts[0];
                  const rest = contacts.slice(1);
                  const primaryName = `${primary?.nombre ?? '-'} ${primary?.apellido ?? ''}`.trim();
                  return <tr key={c.id}>
<td>
<Link className="text-blue-600 hover:underline" href={`/clients/${c.id}`}>{c.nombre_empresa}</Link>
</td>
<td>
<div className="flex items-center gap-2">
<span>{primaryName || '-'}</span>{rest.length > 0 ? <Tooltip label={rest.map((r) => `${r.nombre} ${r.apellido}`.trim()).join(', ')}>
<Badge className="border-blue-200 bg-blue-100 text-blue-700">+{rest.length} más</Badge>
</Tooltip> : null}</div>
</td>
<td>{primary?.email ?? '-'}</td>
<td>{primary?.telefono ?? '-'}</td>
<td>{expiryCell(c.fecha_vencimiento_documentacion)}</td>
<td>{c.deleted_at ? 'Inactivo' : 'Activo'}</td>
<td>
<div className="flex gap-2">
<Button variant="ghost" onClick={() => { setEdit(c); reset(mapClientToForm(c)); setOpen(true); }}>Editar</Button>
<Button variant="danger" onClick={() => setToDelete(c)}>Eliminar</Button>
<Dropdown trigger={<Button variant="ghost">
<MoreHorizontal size={16} />
</Button>}>
<button className="block w-full rounded-[8px] px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface-hover)]" onClick={() => { setEdit(c); reset(mapClientToForm(c)); setOpen(true); }}>Editar cliente</button>
<button className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => setToDelete(c)}>Eliminar</button>
</Dropdown>
</div>
</td>
</tr>;
                })}
              </tbody>
            </Table>
            <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm">
<p>Total: {total} clientes · Página {page} de {totalPages}</p>
<div className="flex gap-2">
<Button variant="secondary" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>Anterior</Button>
<Button variant="secondary" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1) })}>Siguiente</Button>
</div>
</div>
          </>
        )}

        <Modal open={open} title={edit ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setOpen(false)}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
<label className="text-sm font-medium text-[var(--text-secondary)]">Nombre de la empresa</label>
<Input placeholder="Ej: Acme Industrial" {...register('nombre_empresa')} />{errors.nombre_empresa ? <p className="text-xs text-red-500">{errors.nombre_empresa.message}</p> : null}</div>
            <div className="space-y-2">
<label className="text-sm font-medium text-[var(--text-secondary)]">Persona de contacto principal</label>
<Input placeholder="Se completa automáticamente con el primer contacto" {...register('persona_contacto')} />
</div>
            <div className="space-y-2">
<label className="text-sm font-medium text-[var(--text-secondary)]">Dirección</label>
<Input placeholder="Dirección" {...register('direccion')} />
</div>
            <div className="space-y-2">
<label className="text-sm font-medium text-[var(--text-secondary)]">Vencimiento de documentación</label>
<Input type="date" {...register('fecha_vencimiento_documentacion')} />
<p className="text-xs text-[var(--text-muted)]">Fecha de vencimiento de documentación del cliente</p>
</div>
            <div className="space-y-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
<div className="flex items-center justify-between">
<h3 className="text-lg font-medium">Contactos del cliente</h3>
<Button type="button" variant="secondary" onClick={() => append(emptyContact)}>+ Agregar contacto</Button>
</div>{errors.contacts?.message ? <p className="text-xs text-red-500">{errors.contacts.message}</p> : null}<div className="space-y-3">{fields.map((field, index) => <div key={field.id} className="rounded-[10px] border border-[var(--border)] p-4 transition-all duration-150">
<div className="grid gap-3 md:grid-cols-2">
<div>
<label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Nombre</label>
<Input placeholder="Nombre" {...register(`contacts.${index}.nombre`)} />{errors.contacts?.[index]?.nombre ? <p className="mt-1 text-xs text-red-500">{errors.contacts[index]?.nombre?.message}</p> : null}</div>
<div>
<label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Apellido</label>
<Input placeholder="Apellido" {...register(`contacts.${index}.apellido`)} />{errors.contacts?.[index]?.apellido ? <p className="mt-1 text-xs text-red-500">{errors.contacts[index]?.apellido?.message}</p> : null}</div>
<div>
<label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Email</label>
<Input type="email" placeholder="nombre@empresa.com" {...register(`contacts.${index}.email`)} />{errors.contacts?.[index]?.email ? <p className="mt-1 text-xs text-red-500">{errors.contacts[index]?.email?.message}</p> : null}</div>
<div>
<label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Teléfono</label>
<Input placeholder="+54 11 ..." {...register(`contacts.${index}.telefono`)} />
</div>
<div className="md:col-span-2">
<label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Área / Rol</label>
<Input placeholder="Compras, Mantenimiento, Administración..." {...register(`contacts.${index}.area`)} />
</div>
</div>{fields.length > 1 ? <div className="mt-3 flex justify-end">
<Button type="button" variant="danger" onClick={() => remove(index)}>
<Trash2 size={16} /> Eliminar contacto</Button>
</div> : null}</div>)}</div>
</div>
            <div className="space-y-2">
<label className="text-sm font-medium text-[var(--text-secondary)]">Observaciones</label>
<textarea {...register('observaciones')} placeholder="Notas internas del cliente" className="min-h-[96px] w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[#9CA3AF] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(29,78,216,0.15)]" />
</div>
            <div className="flex justify-end">
<Button type="submit">Guardar</Button>
</div>
          </form>
          {loading ? <FormSkeleton /> : null}
        </Modal>

        <ConfirmModal open={!!toDelete} title="Eliminar cliente" message={toDelete ? `Se realizará un soft delete del cliente ${toDelete.nombre_empresa}. Esto puede impactar órdenes activas o integraciones vinculadas.` : ''} onCancel={() => { if (!deleteLoading) setToDelete(null); }} onConfirm={async () => { if (!toDelete) return; setDeleteLoading(true); try { await ClientsApi.remove(toDelete.id); toast({ type: 'info', message: 'Cliente eliminado' }); setToDelete(null); await load(); } catch (error) { toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo eliminar el cliente') }); } finally { setDeleteLoading(false); } }} confirmDisabled={deleteLoading} cancelDisabled={deleteLoading} />
      </div>
    </ErrorBoundary>
  );
}
