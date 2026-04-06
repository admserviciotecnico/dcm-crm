'use client';

import { Bell, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { authStore } from '@/stores/auth-store';
import { uiStore } from '@/stores/ui-store';
import { appStore } from '@/stores/app-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { NotificationsApi } from '@/lib/api/endpoints';
import { getApiErrorMessage } from '@/lib/api/error-message';

const labels: Record<string, string> = { dashboard: 'Dashboard', orders: 'Órdenes', clients: 'Clientes', equipments: 'Equipos', calendar: 'Calendario', profile: 'Administración', users: 'Usuarios', 'automation-rules': 'Automatizaciones' };

export function Header() {
  const user = authStore((s) => s.user);
  const logout = authStore((s) => s.logout);
  const dark = uiStore((s) => s.darkMode);
  const themeReady = uiStore((s) => s.themeReady);
  const hydrateTheme = uiStore((s) => s.hydrateTheme);
  const setDarkMode = uiStore((s) => s.setDarkMode);
  const setCommandOpen = uiStore((s) => s.setCommandOpen);
  const setMobileSidebarOpen = uiStore((s) => s.setMobileSidebarOpen);
  const notifications = appStore((s) => s.notifications);
  const setNotifications = appStore((s) => s.setNotifications);
  const markNotificationsRead = appStore((s) => s.markNotificationsRead);
  const pushToast = appStore((s) => s.pushToast);
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await NotificationsApi.list({ page: 1, pageSize: 8 });
      setNotifications(data.items);
      setUnreadCount(data.unread);
    } catch (error) {
      pushToast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron cargar las notificaciones') });
    }
  }, [pushToast, setNotifications]);

  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const openNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const markAllNotifications = useCallback(async () => {
    try {
      await NotificationsApi.markAllRead();
      markNotificationsRead();
      setUnreadCount(0);
      await loadNotifications();
    } catch (error) {
      pushToast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron actualizar las notificaciones') });
    }
  }, [loadNotifications, markNotificationsRead, pushToast]);

  const handleNotificationClick = useCallback(async (notificationId: string, serviceOrderId?: string | null) => {
    try {
      await NotificationsApi.markRead(notificationId);
      markNotificationsRead([notificationId]);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (serviceOrderId) router.push(`/orders/${serviceOrderId}`);
    } catch (error) {
      pushToast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo marcar la notificación') });
    }
  }, [markNotificationsRead, pushToast, router]);

  const crumbs = pathname.split('/').filter(Boolean).map((p) => labels[p] ?? p);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Button className="md:hidden" variant="ghost" onClick={() => setMobileSidebarOpen(true)}><Menu size={16} /></Button>
        <div>
          <p className="text-xs text-[var(--text-muted)]">{crumbs.join(' / ')}</p>
          <p className="text-sm font-medium">Hola, {user?.first_name ?? 'operador'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="hidden md:block" onClick={() => setCommandOpen(true)}><Input readOnly value="Buscar... (Ctrl/Cmd + K)" className="w-64 cursor-pointer border-[var(--border)] bg-[var(--bg-surface-muted)]" /></button>
        <Button variant="ghost" onClick={() => setCommandOpen(true)} className="text-[var(--text-secondary)]"><Search size={16} /></Button>
        <Dropdown
          onOpen={() => { void openNotifications(); }}
          trigger={
            <span className="relative inline-flex"><Bell size={16} />{unreadCount > 0 ? <span className="absolute -right-2 -top-2 rounded-full bg-blue-600 px-1 text-[10px] text-white">{unreadCount}</span> : null}</span>
          }
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <p className="text-xs text-[var(--text-secondary)]">Notificaciones</p>
            <Button variant="ghost" className="h-7 px-2 text-xs" disabled={unreadCount === 0} onClick={() => void markAllNotifications()}>
              Marcar todas como leídas
            </Button>
          </div>
          <div className="max-h-72 overflow-auto">
            {notifications.length === 0 ? <p className="p-3 text-sm text-[var(--text-secondary)]">Sin notificaciones</p> : notifications.slice(0, 8).map((n) => (
              <button key={n.id} className={`w-full border-b border-[var(--border)] p-3 text-left text-sm ${n.read ? '' : 'bg-[var(--bg-surface-hover)]'}`} onClick={() => void handleNotificationClick(n.id, n.service_order_id)}>
                <p className="font-medium">{n.title}</p>
                <p className="text-[var(--text-secondary)]">{n.description}</p>
              </button>
            ))}
          </div>
        </Dropdown>
        <Button variant="ghost" onClick={() => setDarkMode(!dark)} className="text-[var(--text-secondary)]">{themeReady ? (dark ? <Sun size={16} /> : <Moon size={16} />) : <Moon size={16} />}</Button>
        <Button variant="ghost" onClick={() => { logout(); router.replace('/login'); }} className="text-[var(--text-secondary)]"><LogOut size={16} /></Button>
      </div>
    </header>
  );
}
