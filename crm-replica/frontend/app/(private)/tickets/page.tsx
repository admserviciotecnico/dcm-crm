'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { ClientsApi, FailuresApi, TicketsApi } from '@/lib/api/endpoints';
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
import { TableSkeleton } from '@/components/common/skeletons';
import { ConfirmModal } from '@/components/common/confirm-modal';

type TicketForm = {
  client_id: string;
  channel: 'phone' | 'email' | 'web' | 'whatsapp';
  issue_description: string;
  priority: 'baja' | 'media' | 'alta';
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  triage: 'Pendiente análisis',
  in_diagnosis: 'En diagnóstico',
  resolved_remote: 'Resuelto sin intervención',
  escalated: 'Escalado',
  resolved: 'Resuelto',
  closed: 'Cerrado'
};

const STATUS_HINTS: Record<string, string> = {
  triage: 'Pendiente análisis',
  in_diagnosis: 'En diagnóstico',
  resolved_remote: 'Resuelto sin intervención',
  escalated: 'Enviado a orden'
};

const SLA_BADGE_CLASS: Record<string, string> = {
  ok: 'border-emerald-400 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-400 bg-amber-500/10 text-amber-300',
  breach: 'border-rose-400 bg-rose-500/10 text-rose-300'
};
const WARRANTY_STATUS_LABELS: Record<string, string> = {
  unknown: 'Sin evaluar',
  pending_review: '🟡 Pendiente',
  approved: '🟢 En garantía',
  rejected: '🔴 Fuera de garantía'
};

export default function TicketsPage() {
  const user = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [escalateLoading, setEscalateLoading] = useState(false);
  const [diagnosisSaving, setDiagnosisSaving] = useState(false);
  const [warrantySaving, setWarrantySaving] = useState(false);
  const [diagnosisDraft, setDiagnosisDraft] = useState({ diagnosis: '', diagnosis_result: '', requires_intervention: false, failure_type: '', failure_category: '', root_cause: '', solution: '', resolution_type: 'remote' as 'remote' | 'onsite' | 'replacement' });
  const [failureSuggestions, setFailureSuggestions] = useState<Array<{ id: string; failure_type: string; root_cause: string; solution: string }>>([]);
  const [failureCatalog, setFailureCatalog] = useState<Array<{ id: string; failure_type: string; failure_category: string; common_root_cause: string; recommended_solution: string }>>([]);
  const [warrantyDraft, setWarrantyDraft] = useState({ warranty_reason: '', warranty_notes: '' });
  const PAGE_SIZE = 20;
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TicketForm>({
    defaultValues: {
      channel: 'phone',
      priority: 'media'
    }
  });

  const canAccess = user?.role === 'admin';

  const formatSla = (deadline?: string | null, status?: string | null) => {
    if (!deadline) return 'Sin SLA';
    const remainingMs = new Date(deadline).getTime() - Date.now();
    const hours = Math.round(remainingMs / (60 * 60 * 1000));
    if (status === 'breach' || remainingMs < 0) return `Vencido (${Math.abs(hours)}h)`;
    return `Restan ${hours}h`;
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ticketsRes, clientsRes] = await Promise.all([
        TicketsApi.list({ page, pageSize: PAGE_SIZE, status: statusFilter || undefined, priority: priorityFilter || undefined }),
        ClientsApi.list()
      ]);
      setTickets(ticketsRes.items);
      setTotal(ticketsRes.total);
      setClients(clientsRes);
    } catch (error) {
      const message = getApiErrorMessage(error, 'No se pudieron cargar los tickets');
      setLoadError(message);
      toast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [canAccess, page, priorityFilter, statusFilter]);

  const selectedWithDetails = useMemo(() => tickets.find((ticket) => ticket.id === selected?.id) ?? selected, [selected, tickets]);

  useEffect(() => {
    if (!selectedWithDetails) return;
    setDiagnosisDraft({
      diagnosis: selectedWithDetails.diagnosis ?? '',
      diagnosis_result: selectedWithDetails.diagnosis_result ?? '',
      requires_intervention: Boolean(selectedWithDetails.requires_intervention),
      failure_type: selectedWithDetails.failure_type ?? '',
      failure_category: selectedWithDetails.failure_category ?? '',
      root_cause: selectedWithDetails.root_cause ?? '',
      solution: selectedWithDetails.solution ?? '',
      resolution_type: (selectedWithDetails.resolution_type ?? 'remote') as 'remote' | 'onsite' | 'replacement'
    });
    setWarrantyDraft({
      warranty_reason: selectedWithDetails.warranty_reason ?? '',
      warranty_notes: selectedWithDetails.warranty_notes ?? ''
    });
  }, [selectedWithDetails?.id]);

  const openDetail = async (ticket: Ticket) => {
    setDetailLoading(true);
    setSelected(ticket);
    try {
      const detail = await TicketsApi.get(ticket.id);
      setSelected(detail);
      setDiagnosisDraft({
        diagnosis: detail.diagnosis ?? '',
        diagnosis_result: detail.diagnosis_result ?? '',
        requires_intervention: Boolean(detail.requires_intervention),
        failure_type: detail.failure_type ?? '',
        failure_category: detail.failure_category ?? '',
        root_cause: detail.root_cause ?? '',
        solution: detail.solution ?? '',
        resolution_type: (detail.resolution_type ?? 'remote') as 'remote' | 'onsite' | 'replacement'
      });
      const suggestions = await FailuresApi.suggestions({ equipment_id: detail.equipment_id ?? undefined, failure_type: detail.failure_type ?? undefined });
      setFailureSuggestions(suggestions.map((item) => ({ id: item.id, failure_type: item.failure_type, root_cause: item.root_cause, solution: item.solution })));
      setFailureCatalog(await FailuresApi.catalog());
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(statusFilter || priorityFilter);

  const deleteTicket = async () => {
    if (!selectedWithDetails) return;
    setDeleteLoading(true);
    try {
      await TicketsApi.remove(selectedWithDetails.id);
      toast({ type: 'success', message: 'Ticket eliminado' });
      setConfirmDelete(false);
      setSelected(null);
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo eliminar el ticket') });
    } finally {
      setDeleteLoading(false);
    }
  };

  const escalateTicket = async () => {
    if (!selectedWithDetails) return;
    if (!selectedWithDetails.requires_intervention) {
      toast({ type: 'info', message: 'Marcá "requiere intervención" antes de escalar a orden' });
      return;
    }
    if (!String(selectedWithDetails.diagnosis_result ?? diagnosisDraft.diagnosis_result).trim()) {
      toast({ type: 'info', message: 'Completá la conclusión del diagnóstico antes de escalar a orden' });
      return;
    }
    setEscalateLoading(true);
    try {
      const order = await TicketsApi.escalate(selectedWithDetails.id);
      setSelected((prev) => prev ? {
        ...prev,
        status: 'escalated',
        requires_intervention: true,
        service_orders: [{ id: order.id }, ...(prev.service_orders ?? [])]
      } : prev);
      setTickets((prev) => prev.map((ticket) => ticket.id === selectedWithDetails.id ? {
        ...ticket,
        status: 'escalated',
        requires_intervention: true,
        service_orders: [{ id: order.id }, ...(ticket.service_orders ?? [])]
      } : ticket));
      toast({ type: 'success', message: `Escalado a orden #${order.id.slice(0, 8)}` });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo escalar el ticket a orden') });
    } finally {
      setEscalateLoading(false);
    }
  };

  const saveDiagnosis = async () => {
    if (!selectedWithDetails) return;
    setDiagnosisSaving(true);
    try {
      const updated = await TicketsApi.patch(selectedWithDetails.id, {
        diagnosis: diagnosisDraft.diagnosis || undefined,
        diagnosis_result: diagnosisDraft.diagnosis_result || undefined,
        requires_intervention: diagnosisDraft.requires_intervention,
        failure_type: diagnosisDraft.failure_type || undefined,
        failure_category: diagnosisDraft.failure_category || undefined,
        root_cause: diagnosisDraft.root_cause || undefined,
        solution: diagnosisDraft.solution || undefined,
        resolution_type: diagnosisDraft.resolution_type,
        status: diagnosisDraft.diagnosis && (selectedWithDetails.status === 'new' || selectedWithDetails.status === 'triage') ? 'in_diagnosis' : undefined
      });
      setSelected(updated);
      setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? { ...ticket, ...updated } : ticket));
      toast({ type: 'success', message: 'Diagnóstico guardado' });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo guardar el diagnóstico') });
    } finally {
      setDiagnosisSaving(false);
    }
  };

  const resolveRemote = async () => {
    if (!selectedWithDetails) return;
    if (!diagnosisDraft.diagnosis_result.trim()) {
      toast({ type: 'info', message: 'Completá la conclusión del diagnóstico antes de resolver en remoto' });
      return;
    }
    setDiagnosisSaving(true);
    try {
      const updated = await TicketsApi.patch(selectedWithDetails.id, {
        diagnosis: diagnosisDraft.diagnosis || undefined,
        diagnosis_result: diagnosisDraft.diagnosis_result,
        requires_intervention: false,
        failure_type: diagnosisDraft.failure_type || undefined,
        failure_category: diagnosisDraft.failure_category || undefined,
        root_cause: diagnosisDraft.root_cause || undefined,
        solution: diagnosisDraft.solution || undefined,
        resolution_type: diagnosisDraft.resolution_type,
        status: 'resolved_remote'
      });
      setSelected(updated);
      setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? { ...ticket, ...updated } : ticket));
      setDiagnosisDraft({
        diagnosis: updated.diagnosis ?? '',
        diagnosis_result: updated.diagnosis_result ?? '',
        requires_intervention: Boolean(updated.requires_intervention),
        failure_type: updated.failure_type ?? '',
        failure_category: updated.failure_category ?? '',
        root_cause: updated.root_cause ?? '',
        solution: updated.solution ?? '',
        resolution_type: (updated.resolution_type ?? 'remote') as 'remote' | 'onsite' | 'replacement'
      });
      toast({ type: 'success', message: 'Ticket resuelto en remoto' });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo resolver el ticket en remoto') });
    } finally {
      setDiagnosisSaving(false);
    }
  };

  const reviewWarranty = async (decision: 'approved' | 'rejected') => {
    if (!selectedWithDetails) return;
    setWarrantySaving(true);
    try {
      const updated = await TicketsApi.patch(selectedWithDetails.id, {
        warranty_status: decision,
        coverage: decision === 'approved' ? 'partial' : 'none',
        warranty_reason: warrantyDraft.warranty_reason || undefined,
        warranty_notes: warrantyDraft.warranty_notes || undefined
      });
      setSelected(updated);
      setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? { ...ticket, ...updated } : ticket));
      toast({ type: 'success', message: `Garantía ${decision === 'approved' ? 'aprobada' : 'rechazada'}` });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo registrar la evaluación de garantía') });
    } finally {
      setWarrantySaving(false);
    }
  };
  const markWarrantyPending = async () => {
    if (!selectedWithDetails) return;
    setWarrantySaving(true);
    try {
      const updated = await TicketsApi.patch(selectedWithDetails.id, { warranty_status: 'pending_review' });
      setSelected(updated);
      setTickets((prev) => prev.map((ticket) => ticket.id === updated.id ? { ...ticket, ...updated } : ticket));
      toast({ type: 'success', message: 'Garantía en revisión' });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo iniciar la evaluación de garantía') });
    } finally {
      setWarrantySaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tickets / Reclamos"
        description="Bandeja inicial de intake para reclamos antes de escalar a orden de servicio."
        action={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nuevo ticket</Button>}
      />

      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <Select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} className="max-w-52">
            <option value="">Estado (todos)</option>
            <option value="new">Nuevo</option>
            <option value="triage">Triage</option>
            <option value="in_diagnosis">Diagnóstico</option>
            <option value="resolved_remote">Resuelto remoto</option>
            <option value="escalated">Escalado</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </Select>
          <Select value={priorityFilter} onChange={(event) => { setPage(1); setPriorityFilter(event.target.value); }} className="max-w-52">
            <option value="">Prioridad (todas)</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </Select>
        </div>
        {loading ? <TableSkeleton rows={6} cols={6} /> : null}
        {!loading && loadError ? (
          <div className="space-y-2">
            <p className="text-sm text-red-300">{loadError}</p>
            <Button variant="secondary" onClick={() => void load()}>Reintentar</Button>
          </div>
        ) : null}
        {!loading && !loadError && tickets.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">{hasFilters ? 'No hay tickets con estos filtros.' : 'Todavía no hay tickets. Creá el primer reclamo para iniciar el intake.'}</p> : null}
        {!loading && !loadError && tickets.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <th className="p-2 text-left">Ticket</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2 text-left">Prioridad</th>
                <th className="p-2 text-left">Garantía</th>
                <th className="p-2 text-left">SLA respuesta</th>
                <th className="p-2 text-left">SLA resolución</th>
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
                  <td className="p-2"><span className={`rounded-full border px-2 py-1 text-xs ${ticket.billable ? 'border-red-400 bg-red-500/15 text-red-300' : ticket.warranty_covered ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : 'border-[var(--border)]'}`}>{ticket.billable ? '💰 Facturable' : ticket.warranty_covered ? '🛠 En garantía' : (WARRANTY_STATUS_LABELS[ticket.warranty_status ?? 'unknown'] ?? ticket.warranty_status)}</span></td>
                  <td className="p-2">
                    <span className={`rounded-full border px-2 py-1 text-xs ${SLA_BADGE_CLASS[ticket.sla_response_status ?? 'ok'] ?? SLA_BADGE_CLASS.ok}`}>
                      {formatSla(ticket.sla_response_deadline, ticket.sla_response_status)}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`rounded-full border px-2 py-1 text-xs ${SLA_BADGE_CLASS[ticket.sla_resolution_status ?? 'ok'] ?? SLA_BADGE_CLASS.ok}`}>
                      {formatSla(ticket.sla_resolution_deadline, ticket.sla_resolution_status)}
                    </span>
                  </td>
                  <td className="p-2">{new Date(ticket.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
        {!loading && !loadError && tickets.length > 0 ? (
          <div className="mt-3 flex items-center justify-between text-sm">
            <p>Página {page} de {totalPages} · Total {total} tickets</p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</Button>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Siguiente</Button>
            </div>
          </div>
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
            {STATUS_HINTS[selectedWithDetails.status] ? <p className="text-xs text-[var(--text-secondary)]">{STATUS_HINTS[selectedWithDetails.status]}</p> : null}
            <p><span className="font-medium">Prioridad:</span> {selectedWithDetails.priority}</p>
            <p><span className="font-medium">Descripción:</span> {selectedWithDetails.issue_description}</p>
            <p><span className="font-medium">Garantía:</span> <span className={`rounded-full border px-2 py-1 text-xs ${selectedWithDetails.billable ? 'border-red-400 bg-red-500/15 text-red-300' : selectedWithDetails.warranty_covered ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : 'border-[var(--border)]'}`}>{selectedWithDetails.billable ? '💰 Facturable' : selectedWithDetails.warranty_covered ? '🛠 En garantía' : (WARRANTY_STATUS_LABELS[selectedWithDetails.warranty_status ?? 'unknown'] ?? selectedWithDetails.warranty_status)}</span></p>
            <div className="grid gap-2 md:grid-cols-2">
              <p><span className="font-medium">SLA respuesta:</span> {formatSla(selectedWithDetails.sla_response_deadline, selectedWithDetails.sla_response_status)}</p>
              <p><span className="font-medium">SLA resolución:</span> {formatSla(selectedWithDetails.sla_resolution_deadline, selectedWithDetails.sla_resolution_status)}</p>
            </div>
            {(user?.role === 'admin' || user?.role === 'tecnico') ? (
              <div className="space-y-2 rounded-[10px] border border-[var(--border)] p-3">
                <p className="font-medium">Diagnóstico técnico</p>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)]">Análisis</label>
                  <textarea
                    className="min-h-20 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                    value={diagnosisDraft.diagnosis}
                    onChange={(event) => setDiagnosisDraft((prev) => ({ ...prev, diagnosis: event.target.value }))}
                    placeholder="Detalle de troubleshooting y diagnóstico"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)]">Catálogo de fallas (opcional)</label>
                  <Select value="" onChange={(event) => {
                    const item = failureCatalog.find((row) => row.id === event.target.value);
                    if (!item) return;
                    setDiagnosisDraft((prev) => ({ ...prev, failure_type: item.failure_type, failure_category: item.failure_category, root_cause: item.common_root_cause, solution: item.recommended_solution }));
                  }}>
                    <option value="">Seleccionar conocimiento reutilizable</option>
                    {failureCatalog.map((item) => <option key={item.id} value={item.id}>{item.failure_type} · {item.failure_category}</option>)}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)]">Tipo de falla</label>
                  <Input value={diagnosisDraft.failure_type} onChange={(event) => setDiagnosisDraft((prev) => ({ ...prev, failure_type: event.target.value }))} placeholder="Ej: No enciende" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)]">Categoría</label>
                  <Input value={diagnosisDraft.failure_category} onChange={(event) => setDiagnosisDraft((prev) => ({ ...prev, failure_category: event.target.value }))} placeholder="Ej: Eléctrico" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)]">Causa raíz</label>
                  <textarea className="min-h-20 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm" value={diagnosisDraft.root_cause} onChange={(event) => setDiagnosisDraft((prev) => ({ ...prev, root_cause: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)]">Solución</label>
                  <textarea className="min-h-20 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm" value={diagnosisDraft.solution} onChange={(event) => setDiagnosisDraft((prev) => ({ ...prev, solution: event.target.value }))} />
                </div>
                {failureSuggestions.length > 0 ? <p className="text-xs text-amber-300">Problema similar detectado: {failureSuggestions[0].failure_type} · {failureSuggestions[0].root_cause}</p> : null}
                <div className="space-y-1">
                  <label className="text-xs text-[var(--text-secondary)]">Conclusión</label>
                  <textarea
                    className="min-h-20 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                    value={diagnosisDraft.diagnosis_result}
                    onChange={(event) => setDiagnosisDraft((prev) => ({ ...prev, diagnosis_result: event.target.value }))}
                    placeholder="Conclusión breve del caso"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={diagnosisDraft.requires_intervention}
                    onChange={(event) => setDiagnosisDraft((prev) => ({ ...prev, requires_intervention: event.target.checked }))}
                  />
                  Requiere intervención en campo
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => void saveDiagnosis()} disabled={diagnosisSaving}>
                    {diagnosisSaving ? 'Guardando…' : 'Guardar diagnóstico'}
                  </Button>
                  {!diagnosisDraft.requires_intervention ? (
                    <Button type="button" onClick={() => void resolveRemote()} disabled={diagnosisSaving}>
                      Marcar como resuelto (remoto)
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void escalateTicket()}
                      disabled={escalateLoading || !diagnosisDraft.requires_intervention || !String(diagnosisDraft.diagnosis_result).trim()}
                      title={!String(diagnosisDraft.diagnosis_result).trim() ? 'Debe completar la conclusión del diagnóstico para escalar' : undefined}
                    >
                      {escalateLoading ? 'Creando orden…' : 'Escalar a orden'}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
            <div className="space-y-2 rounded-[10px] border border-[var(--border)] p-3">
              <p className="font-medium">Garantía</p>
              <p><span className="font-medium">Estado:</span> {WARRANTY_STATUS_LABELS[selectedWithDetails.warranty_status ?? 'unknown'] ?? selectedWithDetails.warranty_status}</p>
              <p><span className="font-medium">Cobertura:</span> {selectedWithDetails.coverage ?? 'none'}</p>
              <div className="space-y-1">
                <label className="text-xs text-[var(--text-secondary)]">Motivo</label>
                <Input value={warrantyDraft.warranty_reason} onChange={(event) => setWarrantyDraft((prev) => ({ ...prev, warranty_reason: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--text-secondary)]">Notas internas</label>
                <textarea className="min-h-20 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm" value={warrantyDraft.warranty_notes} onChange={(event) => setWarrantyDraft((prev) => ({ ...prev, warranty_notes: event.target.value }))} />
              </div>
              {user?.role === 'admin' ? (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" disabled={warrantySaving || selectedWithDetails.warranty_status !== 'unknown'} onClick={() => void markWarrantyPending()}>Evaluar garantía</Button>
                  <Button type="button" variant="secondary" disabled={warrantySaving || selectedWithDetails.warranty_status === 'approved'} onClick={() => void reviewWarranty('approved')}>Aprobar</Button>
                  <Button type="button" variant="danger" disabled={warrantySaving || selectedWithDetails.warranty_status === 'rejected'} onClick={() => void reviewWarranty('rejected')}>Rechazar</Button>
                </div>
              ) : null}
            </div>
            {selectedWithDetails.service_orders?.length ? (
              <div>
                <p><span className="font-medium">Órdenes vinculadas:</span></p>
                <ul className="mt-1 space-y-1">
                  {selectedWithDetails.service_orders.map((serviceOrder) => (
                    <li key={serviceOrder.id}>#{serviceOrder.id.slice(0, 8)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="mb-1 font-medium">Eventos</p>
              <div className="space-y-2">
                {selectedWithDetails.events?.length ? selectedWithDetails.events.map((event) => (
                  <div key={event.id} className="rounded-[8px] border border-[var(--border)] px-3 py-2">
                    <p className="font-medium uppercase tracking-wide text-xs text-[var(--text-secondary)]">{event.type}</p>
                    <p className="text-sm">{event.message || 'Sin detalle'}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                )) : <p className="text-xs text-[var(--text-secondary)]">Sin eventos registrados.</p>}
              </div>
            </div>
              <div className="flex justify-end gap-2">
              {(selectedWithDetails.status === 'triage' || selectedWithDetails.status === 'in_diagnosis') && !selectedWithDetails.deleted_at ? (
                <Button
                  variant="secondary"
                  onClick={() => void escalateTicket()}
                  disabled={escalateLoading || !Boolean(selectedWithDetails.requires_intervention) || !String(selectedWithDetails.diagnosis_result ?? diagnosisDraft.diagnosis_result).trim()}
                  title={!String(selectedWithDetails.diagnosis_result ?? diagnosisDraft.diagnosis_result).trim() ? 'Debe completar la conclusión del diagnóstico para escalar' : undefined}
                >
                  {escalateLoading ? 'Creando orden…' : 'Crear orden'}
                </Button>
              ) : null}
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmDelete}
        title="Eliminar ticket"
        message={selectedWithDetails ? `¿Eliminar el ticket #${selectedWithDetails.id.slice(0, 8)}? Se hará soft delete.` : '¿Eliminar ticket?'}
        onCancel={() => { if (!deleteLoading) setConfirmDelete(false); }}
        onConfirm={() => void deleteTicket()}
        confirmDisabled={deleteLoading}
        cancelDisabled={deleteLoading}
      />
    </div>
  );
}
