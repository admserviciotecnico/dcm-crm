'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Protected } from '@/components/layout/protected';
import { CommandPalette } from '@/components/command/command-palette';
import { uiStore } from '@/stores/ui-store';
import { appStore } from '@/stores/app-store';
import { getSocket } from '@/lib/api/socket';

export default function PrivateLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const setCommandOpen = uiStore((s) => s.setCommandOpen);
  const pushNotification = appStore((s) => s.pushNotification);

  useEffect(() => {
    const socket = getSocket();
    const onOrdersChanged = () => pushNotification({ title: 'Órdenes', message: 'Se detectaron cambios en órdenes de servicio.' });
    const onStatusChanged = () => pushNotification({ title: 'Estado actualizado', message: 'Una orden cambió de estado.' });

    socket.on('orders:changed', onOrdersChanged);
    socket.on('orders:status_changed', onStatusChanged);

    return () => {
      socket.off('orders:changed', onOrdersChanged);
      socket.off('orders:status_changed', onStatusChanged);
    };
  }, [pushNotification]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === 'g') {
        const go = (ev: KeyboardEvent) => {
          if (ev.key === 'd') router.push('/dashboard');
          if (ev.key === 'o') router.push('/orders');
          if (ev.key === 'c') router.push('/clients');
          window.removeEventListener('keydown', go);
        };
        window.addEventListener('keydown', go);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, setCommandOpen]);

  return (
    <Protected>
      <div className="flex min-h-screen bg-[var(--bg-app)]">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="bg-[var(--bg-app)] px-6 py-6">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
    </Protected>
  );
}
