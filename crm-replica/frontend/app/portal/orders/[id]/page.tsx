'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { PortalApi } from '@/lib/api/endpoints';
import { PortalProtected } from '@/components/layout/portal-protected';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PortalDocument, ServiceOrder, OrderHistory } from '@/types/domain';
import { StatusBadge, PriorityBadge } from '@/components/common/badges';

export default function PortalOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);

  useEffect(() => {
    Promise.all([
      PortalApi.getOrder(params.id),
      PortalApi.getOrderHistory(params.id),
      PortalApi.getOrderDocuments(params.id)
    ]).then(([orderData, historyData, documentData]) => {
      setOrder(orderData);
      setHistory(historyData);
      setDocuments(documentData);
    }).catch(() => {
      setOrder(null);
      setHistory([]);
      setDocuments([]);
    });
  }, [params.id]);

  const downloadPdf = async () => {
    if (!order) return;
    const blob = await PortalApi.exportPdf(order.id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-order-${order.id.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <PortalProtected>
      <main className="min-h-screen bg-[var(--bg-app)] p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {!order ? <p className="text-sm text-[var(--text-secondary)]">Cargando orden…</p> : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Portal cliente</p>
                  <h1 className="mt-2 text-3xl font-semibold">Orden #{order.id.slice(0, 8)}</h1>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Detalle de solo lectura, historial y archivos asociados.</p>
                </div>
                <Button variant="secondary" onClick={() => void downloadPdf()}><Download size={16} /> Descargar PDF</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card><p className="text-sm text-[var(--text-secondary)]">Estado</p><div className="mt-2"><StatusBadge value={order.estado} /></div></Card>
                <Card><p className="text-sm text-[var(--text-secondary)]">Prioridad</p><div className="mt-2"><PriorityBadge value={order.prioridad} /></div></Card>
                <Card><p className="text-sm text-[var(--text-secondary)]">Fecha programada</p><p className="mt-2 text-sm font-medium">{order.fecha_programada ? new Date(order.fecha_programada).toLocaleString() : 'Sin fecha'}</p></Card>
                <Card><p className="text-sm text-[var(--text-secondary)]">Cliente</p><p className="mt-2 text-sm font-medium">{order.client?.nombre_empresa ?? order.client_id}</p></Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
                <Card>
                  <h2 className="text-lg font-semibold">Resumen del trabajo</h2>
                  <div className="mt-4 space-y-2 text-sm">
                    <p><span className="font-medium">Dirección:</span> {order.direccion_service ?? '—'}</p>
                    <p><span className="font-medium">Observaciones:</span> {order.observaciones ?? '—'}</p>
                    <p><span className="font-medium">Cierre:</span> {order.observaciones_cierre ?? '—'}</p>
                    <p><span className="font-medium">Horas trabajadas:</span> {order.tiempo_trabajado_horas ?? 0}</p>
                  </div>
                  {order.invoice_draft ? (
                    <div className="mt-4 rounded-[10px] border border-amber-300 bg-amber-100 p-3 text-sm text-amber-900">
                      <p className="font-semibold">Borrador de factura</p>
                      <p className="mt-1">Total estimado: {order.invoice_draft.currency} {order.invoice_draft.total_amount.toFixed(2)}</p>
                    </div>
                  ) : null}
                </Card>

                <Card>
                  <h2 className="text-lg font-semibold">Documentos</h2>
                  <div className="mt-4 space-y-2 text-sm">
                    {documents.length === 0 ? <p className="text-[var(--text-secondary)]">No hay documentos disponibles para esta orden.</p> : documents.map((doc) => (
                      <div key={doc.id} className="rounded-[8px] border border-[var(--border)] px-3 py-2">
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-[var(--text-secondary)]">{doc.file_category} · {new Date(doc.created_at).toLocaleString()}</p>
                        {doc.file_path ? <a className="mt-1 inline-flex text-[var(--primary)] hover:underline" href={doc.file_path} target="_blank" rel="noreferrer">Descargar archivo</a> : null}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card>
                <h2 className="text-lg font-semibold">Historial de cambios</h2>
                <Table className="mt-4 border-0">
                  <thead>
                    <tr>
                      <th className="p-3 text-left">Fecha</th>
                      <th className="p-3 text-left">Actor</th>
                      <th className="p-3 text-left">Campo</th>
                      <th className="p-3 text-left">Resumen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className="border-t border-[var(--border)]">
                        <td className="p-3">{new Date(entry.created_at).toLocaleString()}</td>
                        <td className="p-3">{entry.actor_name ?? 'Sistema'}</td>
                        <td className="p-3">{entry.campo_modificado ?? 'estado'}</td>
                        <td className="p-3">{entry.summary ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </>
          )}
        </div>
      </main>
    </PortalProtected>
  );
}
