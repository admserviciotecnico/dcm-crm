'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PortalApi } from '@/lib/api/endpoints';
import { PortalProtected } from '@/components/layout/portal-protected';
import { Card } from '@/components/ui/card';
import { PortalTicketDetail } from '@/types/domain';
import { Button } from '@/components/ui/button';
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

const PORTAL_STATUS_HELP: Record<string, string> = {
  new: 'Recibimos tu caso y lo vamos a revisar.',
  triage: 'Estamos analizando tu caso.',
  in_diagnosis: 'Estamos realizando diagnóstico técnico remoto.',
  resolved_remote: 'Tu caso fue resuelto sin intervención en campo.',
  escalated: 'Un técnico está interviniendo en el equipo.',
  closed: 'El caso quedó cerrado.'
};

function ticketCode(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function PortalTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = appStore((state) => state.pushToast);
  const [ticket, setTicket] = useState<PortalTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await PortalApi.getTicket(params.id);
      setTicket(data);
      setLoadError(null);
    } catch (error) {
      setTicket(null);
      const message = getApiErrorMessage(error, 'No se pudo cargar el detalle del ticket');
      setLoadError(message);
      toast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  return (
    <PortalProtected>
      <main className="min-h-screen bg-[var(--bg-app)] p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Portal cliente</p>
              <h1 className="mt-2 text-3xl font-semibold">Detalle de reclamo</h1>
            </div>
            <Link href="/portal/tickets" className="inline-flex items-center rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm font-medium">Volver a tickets</Link>
          </div>

          {loading ? <Card><p className="text-sm text-[var(--text-secondary)]">Cargando ticket…</p></Card> : null}
          {!loading && loadError ? (
            <Card>
              <p className="text-sm text-red-300">{loadError}</p>
              <Button className="mt-2" variant="secondary" onClick={() => void load()}>Reintentar</Button>
            </Card>
          ) : null}
          {!loading && !loadError && ticket ? (
            <>
              <Card>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Ticket:</span> #{ticketCode(ticket.id)}</p>
                  <p><span className="font-medium">Serie:</span> {ticket.serial_number ?? '—'}</p>
                  <p><span className="font-medium">Estado:</span> <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs">{PORTAL_STATUS_LABELS[ticket.status] ?? ticket.status}</span></p>
                  {PORTAL_STATUS_HELP[ticket.status] ? <p className="text-xs text-[var(--text-secondary)]">{PORTAL_STATUS_HELP[ticket.status]}</p> : null}
                  <p><span className="font-medium">Creado:</span> {new Date(ticket.created_at).toLocaleString()}</p>
                  <p><span className="font-medium">Descripción:</span> {ticket.issue_description}</p>
                  {ticket.diagnosis_result ? <p><span className="font-medium">Resultado diagnóstico:</span> {ticket.diagnosis_result}</p> : null}
                  {ticket.requires_intervention ? <p className="rounded-[8px] border border-amber-300 bg-amber-100 px-3 py-2 text-amber-900">Este caso requiere intervención técnica</p> : null}
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold">Adjuntos</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {!ticket.attachments?.length ? <p className="text-[var(--text-secondary)]">No hay adjuntos para este ticket.</p> : ticket.attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-[8px] border border-[var(--border)] px-3 py-2">
                      <p className="font-medium">{attachment.filename}</p>
                      {attachment.url ? <a href={attachment.url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">Abrir adjunto</a> : <p className="text-[var(--text-secondary)]">Archivo registrado sin URL pública.</p>}
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold">Línea de tiempo</h2>
                <div className="mt-3 space-y-2">
                  {ticket.timeline.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Sin eventos registrados.</p> : ticket.timeline.map((event) => (
                    <div key={event.id} className="rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm">
                      <p className="font-medium uppercase tracking-wide text-xs text-[var(--text-secondary)]">{event.type}</p>
                      <p>{event.message ?? 'Actualización del ticket'}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{new Date(event.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </main>
    </PortalProtected>
  );
}
