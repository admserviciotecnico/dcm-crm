'use client';

import { Bell, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { authStore } from '@/stores/auth-store';
import { uiStore } from '@/stores/ui-store';
import { appStore } from '@/stores/app-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';

const labels: Record<string, string> = { dashboard: 'Dashboard', orders: 'Órdenes', clients: 'Clientes', equipments: 'Equipos', calendar: 'Calendario', profile: 'Administración' };

export function Header() {
  const user = authStore((s) => s.user);
  const logout = authStore((s) => s.logout);
  const dark = uiStore((s) => s.darkMode);
  const setDarkMode = uiStore((s) => s.setDarkMode);
  const setCommandOpen = uiStore((s) => s.setCommandOpen);
  const setMobileSidebarOpen = uiStore((s) => s.setMobileSidebarOpen);
  const notifications = appStore((s) => s.notifications);
  const markNotificationsRead = appStore((s) => s.markNotificationsRead);
  const pathname = usePathname();
  const router = useRouter();


  const crumbs = pathname.split('/').filter(Boolean).map((p) => labels[p] ?? p);
  const unreadCount = notifications.filter((n) => !n.read).length;

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
          onOpen={markNotificationsRead}
          trigger={
            <span className="relative inline-flex"><Bell size={16} />{unreadCount > 0 ? <span className="absolute -right-2 -top-2 rounded-full bg-blue-600 px-1 text-[10px] text-white">{unreadCount}</span> : null}</span>
          }
        >
          <div className="max-h-72 overflow-auto">
            {notifications.length === 0 ? <p className="p-3 text-sm text-slate-400">Sin notificaciones</p> : notifications.slice(0, 8).map((n) => <div key={n.id} className="border-b border-slate-800 p-3 text-sm"><p className="font-medium">{n.title}</p><p className="text-slate-400">{n.message}</p></div>)}
          </div>
        </Dropdown>
        <Button variant="ghost" onClick={() => setDarkMode(!dark)} className="text-[var(--text-secondary)]">{dark ? <Sun size={16} /> : <Moon size={16} />}</Button>
        <Button variant="ghost" onClick={() => { logout(); router.replace('/login'); }} className="text-[var(--text-secondary)]"><LogOut size={16} /></Button>
      </div>
    </header>
  );
}
