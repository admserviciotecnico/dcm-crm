'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, UserRound } from 'lucide-react';
import { ClientsApi, EquipmentsApi, OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { Client, Equipment, ServiceOrder, User } from '@/types/domain';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { RelativeTime } from '@/components/common/relative-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityTimeline } from '@/components/timeline/activity-timeline';
import { parseClientObservaciones, serializeClientObservaciones, ClientContact } from '@/lib/client-contacts';
import { StatusBadge, PriorityBadge } from '@/components/common/badges';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { OrderDetail } from '@/components/orders/order-detail';
import { PageHeader } from '@/components/layout/page-header';
import { CardSkeleton, TableSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/common/skeleton';
import { appStore } from '@/stores/app-store';
import { FileUploader } from '@/modules/documents/components/file-uploader';
import { FileList } from '@/modules/documents/components/file-list';
import { useDocumentsState } from '@/modules/documents/hooks/use-documents-state';

const contactSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  apellido: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  area: z.string().optional()
});

type ContactForm = z.infer<typeof contactSchema>;

type ActivityEvent = { id: string; title: string; subtitle: string; time: string };

const emptyContact: ContactForm = { nombre: '', apellido: '', email: '', telefono: '', area: '' };

export default function Client360Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tab, setTab] = useState('resumen');
  const [client, setClient] = useState<Client | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const { docs, add: addDocument, remove: removeDocument } = useDocumentsState('client', id);
  const toast = appStore((st) => st.pushToast);

  const contactForm = useForm<{ contacts: ContactForm[] }>({
    resolver: zodResolver(z.object({ contacts: z.array(contactSchema).min(1) })),
    defaultValues: { contacts: [emptyContact] }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: contactForm.control,
    name: 'contacts'
  });

  const load = async () => {
    setLoading(true);
    try {
      const [clientsRes, equipmentsRes, ordersRes, usersRes] = await Promise.all([
        ClientsApi.list(),
        EquipmentsApi.list(),
        OrdersApi.list({ page: 1, pageSize: 300, client: id }),
        UsersApi.list()
      ]);

      setClient(clientsRes.find((c) => c.id === id) ?? null);
      setEquipments(equipmentsRes.filter((e) => e.client_id === id));
      setOrders(ordersRes.items.filter((o) => o.client_id === id));
      setUsers(usersRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const parsed = useMemo(() => parseClientObservaciones(client?.observaciones), [client?.observaciones]);

  const contacts = useMemo(() => {
    if (parsed.contacts.length > 0) return parsed.contacts;
    const fullName = client?.persona_contacto?.trim() ?? '';
    const [nombre, ...rest] = fullName.split(' ').filter(Boolean);
    return [{ nombre: nombre ?? '-', apellido: rest.join(' '), email: client?.email, telefono: client?.telefono, area: '' }];
  }, [client?.email, client?.persona_contacto, client?.telefono, parsed.contacts]);

  const primaryContact = contacts[0];

  const kpis = useMemo(() => {
    const activeOrders = orders.filter((o) => o.estado !== 'completado' && o.estado !== 'cancelado').length;
    const completedOrders = orders.filter((o) => o.estado === 'completado').length;
    return { activeOrders, completedOrders, equipments: equipments.length, contacts: contacts.length, totalOrders: orders.length };
  }, [contacts.length, equipments.length, orders]);

  const tabItems = useMemo(() => [
    `resumen (${1})`,
    `contactos (${contacts.length})`,
    `órdenes (${orders.length})`,
    `equipos (${equipments.length})`,
    `documentos (${docs.length})`,
    `actividad (${orders.length + equipments.length + docs.length + 1})`
  ], [contacts.length, docs.length, equipments.length, orders.length]);

  const selectedTab = tab;
  const tabValue = useMemo(() => tabItems.find((item) => item.startsWith(tab)) ?? tabItems[0], [tab, tabItems]);

  const saveContacts = async (values: { contacts: ContactForm[] }) => {
    if (!client) return;
    const normalized: ClientContact[] = values.contacts.map((c) => ({
      nombre: c.nombre.trim(),
      apellido: c.apellido.trim(),
      email: c.email?.trim() || undefined,
      telefono: c.telefono?.trim() || undefined,
      area: c.area?.trim() || undefined
    }));

    const first = normalized[0];
    await ClientsApi.update(client.id, {
      nombre_empresa: client.nombre_empresa,
      persona_contacto: `${first?.nombre ?? ''} ${first?.apellido ?? ''}`.trim(),
      email: first?.email || client.email,
      telefono: first?.telefono || client.telefono,
      fecha_vencimiento_documentacion: client.fecha_vencimiento_documentacion,
      observaciones: serializeClientObservaciones(normalized, parsed.observaciones)
    });

    setContactModalOpen(false);
    await load();
  };

  const removeContact = async (index: number) => {
    if (!client || contacts.length <= 1) return;
    const next = contacts.filter((_, i) => i !== index);
    const primary = next[0];
    await ClientsApi.update(client.id, {
      nombre_empresa: client.nombre_empresa,
      persona_contacto: `${primary?.nombre ?? ''} ${primary?.apellido ?? ''}`.trim(),
      email: primary?.email || client.email,
      telefono: primary?.telefono || client.telefono,
      fecha_vencimiento_documentacion: client.fecha_vencimiento_documentacion,
      observaciones: serializeClientObservaciones(next, parsed.observaciones)
    });
    await load();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const base = [o.id, o.estado, o.prioridad, o.client?.nombre_empresa ?? o.client_id].join(' ').toLowerCase();
      const statusMatch = orderStatusFilter ? o.estado === orderStatusFilter : true;
      const searchMatch = orderSearch.trim() ? base.includes(orderSearch.toLowerCase()) : true;
      return statusMatch && searchMatch;
    });
  }, [orderSearch, orderStatusFilter, orders]);

  const filteredEquipments = useMemo(() => equipments.filter((e) => {
    const base = [e.tipo_equipo, e.modelo ?? '', e.numero_serie, e.estado_actual].join(' ').toLowerCase();
    return equipmentSearch.trim() ? base.includes(equipmentSearch.toLowerCase()) : true;
  }), [equipmentSearch, equipments]);

  const techNames = (order: ServiceOrder) => (order.technicians ?? []).map((t) => {
    const user = users.find((u) => u.id === t.technician_id);
    return user ? `${user.first_name} ${user.last_name}` : t.technician_id;
  });

  const activityEvents = useMemo<ActivityEvent[]>(() => {
    const baseEvents: ActivityEvent[] = [
      {
        id: `client-${client?.id ?? 'unknown'}`,
        title: 'Cliente creado',
        subtitle: client?.nombre_empresa ?? 'Cliente',
        time: client?.fecha_vencimiento_documentacion || new Date().toISOString()
      },
      ...orders.map((o) => ({
        id: `order-created-${o.id}`,
        title: `Orden #${o.id.slice(0, 8)} creada`,
        subtitle: `Estado ${o.estado}`,
        time: o.fecha_programada || new Date().toISOString()
      })),
      ...orders.filter((o) => o.estado === 'completado').map((o) => ({
        id: `order-completed-${o.id}`,
        title: `Orden #${o.id.slice(0, 8)} completada`,
        subtitle: `Prioridad ${o.prioridad}`,
        time: o.fecha_programada || new Date().toISOString()
      })),
      ...equipments.map((e) => ({
        id: `equipment-${e.id}`,
        title: `Equipo agregado · ${e.tipo_equipo}`,
        subtitle: e.numero_serie,
        time: new Date().toISOString()
      })),
      ...docs.map((d) => ({ id: `document-${d.id}`, title: `Documento agregado · ${d.name}`, subtitle: d.category, time: d.createdAt }))
    ];

    return baseEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [client?.fecha_vencimiento_documentacion, client?.id, client?.nombre_empresa, docs, equipments, orders]);

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  if (!client) return <Card>Cliente no encontrado.</Card>;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-[var(--text-secondary)]">Clientes / {client.nombre_empresa}</p>
        <PageHeader
          title={client.nombre_empresa}
          description={`${primaryContact?.nombre ?? '-'} ${primaryContact?.apellido ?? ''}`.trim() + ` • ${primaryContact?.telefono ?? '-'} • ${primaryContact?.email ?? '-'}`}
          action={<><Button variant="secondary" onClick={() => router.push('/clients')}>Editar cliente</Button><Button onClick={() => router.push('/orders')}>Nueva orden</Button><Button variant="secondary" onClick={() => router.push('/equipments')}>Agregar equipo</Button><Button variant="secondary" onClick={() => { replace(contacts.map((c) => ({ nombre: c.nombre ?? '', apellido: c.apellido ?? '', email: c.email ?? '', telefono: c.telefono ?? '', area: c.area ?? '' }))); setContactModalOpen(true); }}>Agregar contacto</Button></>}
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className="border-blue-200 bg-blue-100 text-blue-700">Órdenes activas: {kpis.activeOrders}</Badge>
          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Órdenes completadas: {kpis.completedOrders}</Badge>
          <Badge className="border-slate-300 bg-slate-100 text-slate-700">Órdenes totales: {kpis.totalOrders}</Badge>
          <Badge className="border-amber-200 bg-amber-100 text-amber-700">Equipos instalados: {kpis.equipments}</Badge>
          <Badge className="border-purple-200 bg-purple-100 text-purple-700">Contactos: {kpis.contacts}</Badge>
        </div>
      </Card>

      <div className="sticky top-20 z-20 bg-[var(--bg-app)] py-2">
        <Tabs items={tabItems} value={tabValue} onChange={(value) => setTab(value.split(' (')[0] ?? value)} />
      </div>

      {selectedTab === 'resumen' ? (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-medium">Información general</h2>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div><p className="text-[var(--text-secondary)]">Empresa</p><p>{client.nombre_empresa}</p></div>
              <div><p className="text-[var(--text-secondary)]">Persona contacto principal</p><p>{`${primaryContact?.nombre ?? '-'} ${primaryContact?.apellido ?? ''}`.trim()}</p></div>
              <div><p className="text-[var(--text-secondary)]">Email principal</p><p>{primaryContact?.email ?? '-'}</p></div>
              <div><p className="text-[var(--text-secondary)]">Teléfono principal</p><p>{primaryContact?.telefono ?? '-'}</p></div>
              <div><p className="text-[var(--text-secondary)]">Vencimiento documentación</p><p>{client.fecha_vencimiento_documentacion ?? '-'}</p></div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between"><h2 className="text-lg font-medium">Contactos destacados</h2><Button variant="secondary" onClick={() => setTab('contactos')}>Ver todos los contactos</Button></div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {contacts.slice(0, 3).map((c, idx) => (
                <div key={`${c.nombre}-${c.apellido}-${idx}`} className="rounded-[10px] border border-[var(--border)] p-3 text-sm shadow-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]">
                  <p className="font-medium">{`${c.nombre} ${c.apellido}`}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{c.area || 'Sin área / rol'}</p>
                  <p>{c.email || '-'}</p>
                  <p>{c.telefono || '-'}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between"><h2 className="text-lg font-medium">Equipos del cliente</h2><Button variant="secondary" onClick={() => setTab('equipos')}>Ver todos los equipos</Button></div>
            <Table className="mt-3">
              <thead><tr><th>Tipo</th><th>Modelo</th><th>Número serie</th><th>Estado</th></tr></thead>
              <tbody>{equipments.slice(0, 5).map((e) => <tr key={e.id}><td>{e.tipo_equipo}</td><td>{e.modelo ?? '-'}</td><td className="mono">{e.numero_serie}</td><td>{e.estado_actual}</td></tr>)}</tbody>
            </Table>
          </Card>

          <Card>
            <div className="flex items-center justify-between"><h2 className="text-lg font-medium">Órdenes recientes</h2><Button variant="secondary" onClick={() => setTab('órdenes')}>Ver todas las órdenes</Button></div>
            <Table className="mt-3">
              <thead><tr><th>ID</th><th>Estado</th><th>Prioridad</th><th>Fecha</th></tr></thead>
              <tbody>{orders.slice(0, 5).map((o) => <tr key={o.id}><td className="mono">#{o.id.slice(0, 8)}</td><td><StatusBadge value={o.estado} /></td><td><PriorityBadge value={o.prioridad} /></td><td><RelativeTime value={o.fecha_programada} /></td></tr>)}</tbody>
            </Table>
          </Card>
        </div>
      ) : null}

      {selectedTab === 'contactos' ? (
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-medium">Contactos</h2><Button onClick={() => { replace(contacts.map((c) => ({ nombre: c.nombre ?? '', apellido: c.apellido ?? '', email: c.email ?? '', telefono: c.telefono ?? '', area: c.area ?? '' }))); setContactModalOpen(true); }}><Plus size={16} /> Agregar contacto</Button></div>
          {contacts.length === 0 ? <EmptyState variant="clients" title="Sin contactos" subtitle="Agregá contactos para mejorar la gestión comercial." /> : (
            <div className="grid gap-3 md:grid-cols-2">
              {contacts.map((contact, idx) => (
                <div key={`${contact.nombre}-${contact.apellido}-${idx}`} className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-sm shadow-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-blue-700"><UserRound size={16} /></div>
                      <div>
                        <p className="font-medium">{`${contact.nombre ?? ''} ${contact.apellido ?? ''}`.trim() || 'Sin nombre'}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{contact.area || 'Sin área / rol'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="secondary" onClick={() => { replace(contacts.map((c) => ({ nombre: c.nombre ?? '', apellido: c.apellido ?? '', email: c.email ?? '', telefono: c.telefono ?? '', area: c.area ?? '' }))); setContactModalOpen(true); }}>Editar</Button>
                      <Button variant="danger" onClick={() => void removeContact(idx)}><Trash2 size={16} /></Button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {contact.email ? <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a> : <p className="text-[var(--text-muted)]">Sin email</p>}
                    {contact.telefono ? <a href={`tel:${contact.telefono}`} className="text-blue-600 hover:underline">{contact.telefono}</a> : <p className="text-[var(--text-muted)]">Sin teléfono</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {selectedTab === 'órdenes' ? (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium">Órdenes</h2>
            <div className="flex items-center gap-2">
              <Input placeholder="Buscar orden..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="w-60" />
              <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="h-10 rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm">
                <option value="">Todos los estados</option>
                <option value="service_programado">Programado</option>
                <option value="en_ejecucion">En ejecución</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          {filteredOrders.length === 0 ? <EmptyState variant="orders" title="Sin órdenes" subtitle="Este cliente todavía no tiene órdenes asociadas." /> : (
            <Table>
              <thead><tr><th>ID</th><th>Estado</th><th>Prioridad</th><th>Técnicos</th><th>Fecha programada</th><th>Demorado</th></tr></thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="cursor-pointer" onClick={() => setSelectedOrder(o)}>
                    <td className="mono">#{o.id.slice(0, 8)}</td>
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

      {selectedTab === 'equipos' ? (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-medium">Equipos</h2><div className="flex items-center gap-2"><Input placeholder="Buscar equipo..." value={equipmentSearch} onChange={(e) => setEquipmentSearch(e.target.value)} className="w-60" /><Button onClick={() => router.push('/equipments')}>+ Nuevo equipo</Button></div></div>
          {filteredEquipments.length === 0 ? <EmptyState variant="equipments" title="Sin equipos" subtitle="Este cliente todavía no tiene equipos instalados." /> : (
            <Table>
              <thead><tr><th>Tipo</th><th>Modelo</th><th>Número serie</th><th>Ubicación</th><th>Estado</th></tr></thead>
              <tbody>{filteredEquipments.map((e) => <tr key={e.id} className="cursor-pointer" onClick={() => router.push(`/equipments/${e.id}`)}><td><span className="text-blue-300 hover:underline">{e.tipo_equipo}</span></td><td>{e.modelo ?? '-'}</td><td className="mono">{e.numero_serie}</td><td>{e.client_id}</td><td>{e.estado_actual}</td></tr>)}</tbody>
            </Table>
          )}
        </Card>
      ) : null}

      {selectedTab === 'documentos' ? (
        <Card>
          <h2 className="text-lg font-medium">Documentos</h2>
          <div className="my-3"><FileUploader onAdd={(name, category) => { const result = addDocument(name, category); if (result.ok) toast({ type: 'success', message: 'Documento agregado al cliente' }); else if (result.reason === 'duplicate') toast({ type: 'info', message: 'Ese documento ya existe para este cliente' }); else toast({ type: 'error', message: 'Nombre de documento inválido' }); }} /></div>
          {docs.length === 0 ? <EmptyState variant="default" title="Sin documentos" subtitle="Subí archivos para centralizar la documentación del cliente." /> : (
            <div className="space-y-3">
              <FileList docs={docs.filter((d) => d.category === 'contract')} onRemove={(docId) => { const result = removeDocument(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} title="Contratos" hideWhenEmpty />
              <FileList docs={docs.filter((d) => d.category === 'report')} onRemove={(docId) => { const result = removeDocument(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} title="Reportes" hideWhenEmpty />
              <FileList docs={docs.filter((d) => d.category === 'photo')} onRemove={(docId) => { const result = removeDocument(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} title="Fotos" hideWhenEmpty />
              <FileList docs={docs.filter((d) => d.category === 'other')} onRemove={(docId) => { const result = removeDocument(docId); if (result.ok) toast({ type: 'info', message: 'Documento eliminado' }); else toast({ type: 'error', message: 'No se pudo eliminar el documento' }); }} title="Otros" hideWhenEmpty />
            </div>
          )}
        </Card>
      ) : null}

      {selectedTab === 'actividad' ? (
        <Card>
          <h2 className="text-lg font-medium">Actividad</h2>
          {activityEvents.length === 0 ? <EmptyState variant="default" title="Sin actividad" subtitle="No hay eventos registrados para este cliente todavía." /> : (
<ActivityTimeline events={activityEvents.map((event) => ({ id: event.id, actor: 'Sistema', action: event.title, entity: event.subtitle, at: event.time }))} />
          )}
        </Card>
      ) : null}

      <Modal open={contactModalOpen} title="Gestionar contactos" onClose={() => setContactModalOpen(false)}>
        <form className="space-y-3" onSubmit={contactForm.handleSubmit(saveContacts)}>
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-[10px] border border-[var(--border)] p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Nombre" {...contactForm.register(`contacts.${index}.nombre`)} />
                <Input placeholder="Apellido" {...contactForm.register(`contacts.${index}.apellido`)} />
                <Input placeholder="Email" {...contactForm.register(`contacts.${index}.email`)} />
                <Input placeholder="Teléfono" {...contactForm.register(`contacts.${index}.telefono`)} />
                <div className="md:col-span-2"><Input placeholder="Área / Rol" {...contactForm.register(`contacts.${index}.area`)} /></div>
              </div>
              {fields.length > 1 ? <div className="mt-2 flex justify-end"><Button type="button" variant="danger" onClick={() => remove(index)}><Trash2 size={16} /></Button></div> : null}
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={() => append(emptyContact)}><Plus size={16} /> Agregar contacto</Button>
            <Button type="submit">Guardar contactos</Button>
          </div>
        </form>
      </Modal>

      <OrderDetail order={selectedOrder} users={users} onClose={() => setSelectedOrder(null)} onRefresh={load} />
    </div>
  );
}
