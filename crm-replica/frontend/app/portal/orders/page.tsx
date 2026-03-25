'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { PortalApi } from '@/lib/api/endpoints';
import { PortalProtected } from '@/components/layout/portal-protected';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/common/badges';
import { ServiceOrder } from '@/types/domain';
import { Button } from '@/components/ui/button';

export default function PortalOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  useEffect(() => {
    PortalApi.listOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const downloadPdf = async (id: string) => {
    const blob = await PortalApi.exportPdf(id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `service-order-${id.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <PortalProtected>
      <main className="min-h-screen bg-[var(--bg-app)] p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Portal cliente</p>
            <h1 className="mt-2 text-3xl font-semibold">Órdenes de servicio</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Vista de solo lectura de las órdenes pertenecientes a tu empresa.</p>
          </div>
          <Card className="p-0">
            <Table className="border-0">
              <thead>
                <tr>
                  <th className="p-3 text-left">Orden</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Prioridad</th>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Factura</th>
                  <th className="p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-[var(--border)]">
                    <td className="p-3 font-medium">#{order.id.slice(0, 8)}</td>
                    <td className="p-3"><StatusBadge value={order.estado} /></td>
                    <td className="p-3"><PriorityBadge value={order.prioridad} /></td>
                    <td className="p-3">{order.fecha_programada ? new Date(order.fecha_programada).toLocaleString() : 'Sin fecha'}</td>
                    <td className="p-3">{order.invoice_draft ? 'Borrador disponible' : '—'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/portal/orders/${order.id}`} className="inline-flex items-center rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm font-medium">Ver detalle</Link>
                        <Button variant="secondary" onClick={() => void downloadPdf(order.id)}><Download size={14} /> PDF</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      </main>
    </PortalProtected>
  );
}
