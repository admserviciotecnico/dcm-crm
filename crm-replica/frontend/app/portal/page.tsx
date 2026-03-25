'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileText, LogOut, PackageSearch } from 'lucide-react';
import { PortalApi } from '@/lib/api/endpoints';
import { PortalProtected } from '@/components/layout/portal-protected';
import { portalAuthStore } from '@/stores/portal-auth-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceOrder } from '@/types/domain';

export default function PortalHomePage() {
  const user = portalAuthStore((state) => state.user);
  const logout = portalAuthStore((state) => state.logout);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);

  useEffect(() => {
    PortalApi.listOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const completed = orders.filter((order) => order.estado === 'completado').length;

  return (
    <PortalProtected>
      <main className="min-h-screen bg-[var(--bg-app)] p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Portal cliente</p>
              <h1 className="mt-2 text-3xl font-semibold">{user?.client_name ?? 'Tu empresa'}</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Acceso de solo lectura a órdenes, historial, documentos y PDFs disponibles.</p>
            </div>
            <Button variant="secondary" onClick={logout}><LogOut size={16} /> Cerrar sesión</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-sm text-[var(--text-secondary)]">Órdenes visibles</p>
              <p className="mt-2 text-3xl font-semibold">{orders.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-secondary)]">Órdenes completadas</p>
              <p className="mt-2 text-3xl font-semibold">{completed}</p>
            </Card>
            <Card>
              <p className="text-sm text-[var(--text-secondary)]">Último acceso</p>
              <p className="mt-2 text-sm font-medium">{user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Primer acceso'}</p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Órdenes de servicio</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Revisá el estado, materiales, borradores de factura e historial de cada orden.</p>
              </div>
              <Link href="/portal/orders" className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white">
                <PackageSearch size={16} /> Ver órdenes
              </Link>
            </Card>
            <Card className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Documentación disponible</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Descargá archivos adjuntos y PDFs asociados a tus órdenes cuando estén disponibles.</p>
              </div>
              <Link href="/portal/orders" className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] px-3 py-2 text-sm font-medium">
                <FileText size={16} /> Ir a documentos
              </Link>
            </Card>
          </div>
        </div>
      </main>
    </PortalProtected>
  );
}
