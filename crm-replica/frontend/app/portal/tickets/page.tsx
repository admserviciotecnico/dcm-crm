'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { PortalApi } from '@/lib/api/endpoints';
import { PortalProtected } from '@/components/layout/portal-protected';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { PortalTicketSummary } from '@/types/domain';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';

const PORTAL_STATUS_LABELS: Record<string, string> = {
  new: 'Recibido',
  triage: 'En revisión',
  in_diagnosis: 'En diagnóstico',
  resolved_remote: 'Resuelto',
  escalated: 'En intervención técnica',
  closed: 'Cerrado'
};
const WARRANTY_LABELS: Record<string, string> = {
  unknown: 'Sin evaluar',
  pending_review: 'Pendiente',
  approved: 'En garantía',
  rejected: 'Fuera de garantía'
};

function ticketCode(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function PortalTicketsPage() {
  const router = useRouter();
  const toast = appStore((state) => state.pushToast);
  const [tickets, setTickets] = useState<PortalTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentPath, setAttachmentPath] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await PortalApi.listTickets();
      setTickets(data);
      setLoadError(null);
    } catch (error) {
      setTickets([]);
      setLoadError(getApiErrorMessage(error, 'No se pudieron cargar los tickets'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const shortDescription = useMemo(() => (text: string) => text.length > 90 ? `${text.slice(0, 90)}…` : text, []);

  const createTicket = async () => {
    if (!serialNumber.trim() || !issueDescription.trim()) {
      toast({ type: 'info', message: 'Completá serie y descripción para crear el reclamo' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await PortalApi.createTicket({
        serial_number: serialNumber.trim(),
        issue_description: issueDescription.trim(),
        attachments: attachmentName.trim() ? [{ file_name: attachmentName.trim(), file_path: attachmentPath.trim() || undefined }] : undefined
      });
      if (created.warning) {
        toast({ type: 'info', message: created.warning });
      }
      toast({ type: 'success', message: `Reclamo Ticket #${ticketCode(created.ticket.id)} creado correctamente` });
      setShowCreate(false);
      setSerialNumber('');
      setIssueDescription('');
      setAttachmentName('');
      setAttachmentPath('');
      await load();
      router.push(`/portal/tickets/${created.ticket.id}`);
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo crear el reclamo') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalProtected>
      <main className="min-h-screen bg-[var(--bg-app)] p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Portal cliente</p>
              <h1 className="mt-2 text-3xl font-semibold">Reclamos / Tickets</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Seguimiento completo del ciclo de soporte técnico.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/portal/orders" className="inline-flex items-center rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm font-medium">Ver órdenes</Link>
              <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nuevo reclamo</Button>
            </div>
          </div>

          <Card className="p-0">
            {loading ? <p className="p-4 text-sm text-[var(--text-secondary)]">Cargando tickets…</p> : null}
            {!loading && loadError ? (
              <div className="p-4">
                <p className="text-sm text-red-300">{loadError}</p>
                <Button className="mt-2" variant="secondary" onClick={() => void load()}>Reintentar</Button>
              </div>
            ) : null}
            {!loading && !loadError && tickets.length === 0 ? <p className="p-4 text-sm text-[var(--text-secondary)]">No tienes tickets aún.</p> : null}
            {!loadError ? (
              <Table className="border-0">
                <thead>
                  <tr>
                    <th className="p-3 text-left">Ticket</th>
                    <th className="p-3 text-left">Descripción</th>
                    <th className="p-3 text-left">Estado</th>
                    <th className="p-3 text-left">Garantía</th>
                    <th className="p-3 text-left">Fecha</th>
                    <th className="p-3 text-left">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-[var(--border)]">
                      <td className="p-3 font-medium">Ticket #{ticketCode(ticket.id)}</td>
                      <td className="p-3">{shortDescription(ticket.issue_description)}</td>
                      <td className="p-3"><span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs">{PORTAL_STATUS_LABELS[ticket.status] ?? ticket.status}</span></td>
                      <td className="p-3">{WARRANTY_LABELS[ticket.warranty_status ?? 'unknown'] ?? ticket.warranty_status}</td>
                      <td className="p-3">{new Date(ticket.created_at).toLocaleString()}</td>
                      <td className="p-3"><Link href={`/portal/tickets/${ticket.id}`} className="text-cyan-300 hover:underline">Ver detalle</Link></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}
          </Card>
        </div>
      </main>

      <Modal open={showCreate} title="Nuevo reclamo" onClose={() => !submitting && setShowCreate(false)}>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">Número de serie</label>
            <Input value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} placeholder="Ej: SN-12345" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">Descripción del problema</label>
            <textarea
              className="min-h-24 w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              placeholder="Describe el síntoma o falla observada"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)]">Adjunto (opcional)</label>
            <Input value={attachmentName} onChange={(event) => setAttachmentName(event.target.value)} placeholder="Nombre del archivo" />
            <Input value={attachmentPath} onChange={(event) => setAttachmentPath(event.target.value)} placeholder="URL del archivo (opcional)" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} disabled={submitting}>Cancelar</Button>
            <Button type="button" onClick={() => void createTicket()} disabled={submitting}>{submitting ? 'Creando…' : 'Crear reclamo'}</Button>
          </div>
        </div>
      </Modal>
    </PortalProtected>
  );
}
