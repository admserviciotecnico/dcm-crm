'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { ClientsApi, TicketsApi } from '@/lib/api/endpoints';
import { Client, Ticket } from '@/types/domain';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

type TicketForm = {
  client_id: string;
  channel: 'phone' | 'email' | 'web' | 'whatsapp';
  issue_description: string;
  priority: 'baja' | 'media' | 'alta';
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  triage: 'Triage',
  in_diagnosis: 'Diagnóstico',
  escalated: 'Escalado',
  resolved: 'Resuelto',
  closed: 'Cerrado'
};

export default function TicketsPage() {
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TicketForm>({
    defaultValues: {
      channel: 'phone',
      priority: 'media'
    }
  });

  const canAccess = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const [ticketsRes, clientsRes] = await Promise.all([
        TicketsApi.list({ page: 1, pageSize: 50 }),
        ClientsApi.list()
      ]);
      setTickets(ticketsRes.items);
      setClients(clientsRes);
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron cargar los tickets') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [canAccess]);

  const selectedWithDetails = useMemo(() => tickets.find((ticket) => ticket.id === selected?.id) ?? selected, [selected, tickets]);

  const openDetail = async (ticket: Ticket) => {
    setDetailLoading(true);
    setSelected(ticket);
    try {
      const detail = await TicketsApi.get(ticket.id);
      setSelected(detail);
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo cargar el detalle del ticket') });
    } finally {
      setDetailLoading(false);
    }
  };

  const onCreate = handleSubmit(async (values) => {
    try {
      await TicketsApi.create(values);
      toast({ type: 'success', message: 'Ticket creado correctamente' });
      setShowCreate(false);
      reset({ channel: 'phone', priority: 'media', client_id: '', issue_description: '' });
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo crear el ticket') });
    }
  });

  if (!canAccess) {
    return <p className="text-sm text-[var(--text-secondary)]">Esta sección está disponible solo para administradores.</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tickets / Reclamos"
        description="Bandeja inicial de intake para reclamos antes de escalar a orden de servicio."
        action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nuevo ticket</Button>}
      />

      <Card>
        {loading ? <p className="text-sm text-[var(--text-secondary)]">Cargando tickets…</p> : null}
        {!loading && tickets.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No hay tickets cargados.</p> : null}
        {!loading && tickets.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <th className="p-2 text-left">Ticket</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2 text-left">Prioridad</th>
                <th className="p-2 text-left">Creado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--bg-surface-hover)]" onClick={() => void openDetail(ticket)}>
                  <td className="p-2 mono text-xs">#{ticket.id.slice(0, 8)}</td>
                  <td className="p-2">{ticket.client?.nombre_empresa ?? ticket.client_id}</td>
                  <td className="p-2">{STATUS_LABELS[ticket.status] ?? ticket.status}</td>
                  <td className="p-2 capitalize">{ticket.priority}</td>
                  <td className="p-2">{new Date(ticket.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
      </Card>

      <Modal open={showCreate} title="Crear ticket" onClose={() => setShowCreate(false)}>
        <form className="grid gap-3" onSubmit={onCreate}>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">Cliente</label>
            <Select {...register('client_id')}>
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.nombre_empresa}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">Canal</label>
            <Select {...register('channel')}>
              <option value="phone">Teléfono</option>
              <option value="email">Email</option>
              <option value="web">Web</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">Prioridad</label>
            <Select {...register('priority')}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">Descripción</label>
            <Input placeholder="Describí el reclamo" {...register('issue_description')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : 'Crear ticket'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selectedWithDetails} title={selectedWithDetails ? `Ticket #${selectedWithDetails.id.slice(0, 8)}` : 'Ticket'} onClose={() => setSelected(null)}>
        {!selectedWithDetails ? null : (
          <div className="space-y-3 text-sm">
            {detailLoading ? <p className="text-[var(--text-secondary)]">Cargando detalle…</p> : null}
            <p><span className="font-medium">Cliente:</span> {selectedWithDetails.client?.nombre_empresa ?? selectedWithDetails.client_id}</p>
            <p><span className="font-medium">Canal:</span> {selectedWithDetails.channel}</p>
            <p><span className="font-medium">Estado:</span> {STATUS_LABELS[selectedWithDetails.status] ?? selectedWithDetails.status}</p>
            <p><span className="font-medium">Prioridad:</span> {selectedWithDetails.priority}</p>
            <p><span className="font-medium">Descripción:</span> {selectedWithDetails.issue_description}</p>
            <div>
              <p className="mb-1 font-medium">Eventos</p>
              <div className="space-y-2">
                {selectedWithDetails.events?.length ? selectedWithDetails.events.map((event) => (
                  <div key={event.id} className="rounded-[8px] border border-[var(--border)] px-3 py-2">
                    <p className="font-medium">{event.type}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{new Date(event.created_at).toLocaleString()}</p>
                    {event.message ? <p className="mt-1 text-sm">{event.message}</p> : null}
                  </div>
                )) : <p className="text-xs text-[var(--text-secondary)]">Sin eventos registrados.</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
