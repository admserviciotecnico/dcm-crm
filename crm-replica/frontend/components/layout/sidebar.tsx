'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Calendar, Users, Package, Settings, PanelLeftClose, PanelLeftOpen, KanbanSquare, Activity, CalendarRange } from 'lucide-react';
import { useState } from 'react';
import { authStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { uiStore } from '@/stores/ui-store';
 
type LinkItem = { href: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean; match?: string[] };
const groups: { title: string; links: LinkItem[] }[] = [
  { title: 'Dashboard', links: [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard }] },
  { title: 'Operaciones', links: [{ href: '/orders', label: 'Órdenes', icon: ClipboardList, match: ['/orders', '/orders/kanban'] }, { href: '/orders/kanban', label: 'Kanban', icon: KanbanSquare }, { href: '/planner', label: 'Planner', icon: CalendarRange }, { href: '/calendar', label: 'Calendario', icon: Calendar }] },
  { title: 'Clientes', links: [{ href: '/clients', label: 'Empresas', icon: Users }] },
  { title: 'Equipos', links: [{ href: '/equipments', label: 'Instalados', icon: Package }] },
  { title: 'Colaboración', links: [{ href: '/activity', label: 'Actividad', icon: Activity }] },
  { title: 'Administración', links: [{ href: '/users', label: 'Usuarios', icon: Users, adminOnly: true }, { href: '/profile', label: 'Configuración', icon: Settings }] }

const groups = [
  { title: 'Dashboard', links: [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard }] },
  { title: 'Operaciones', links: [{ href: '/orders', label: 'Órdenes', icon: ClipboardList }, { href: '/orders/kanban', label: 'Kanban', icon: KanbanSquare }, { href: '/planner', label: 'Planner', icon: CalendarRange }, { href: '/calendar', label: 'Calendario', icon: Calendar }] },
  { title: 'Clientes', links: [{ href: '/clients', label: 'Empresas', icon: Users }] },
  { title: 'Equipos', links: [{ href: '/equipments', label: 'Instalados', icon: Package }] },
  { title: 'Colaboración', links: [{ href: '/activity', label: 'Actividad', icon: Activity }] },
  { title: 'Administración', links: [{ href: '/profile', label: 'Configuración', icon: Settings }] }
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const user = authStore((s) => s.user);
  const mobileOpen = uiStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = uiStore((s) => s.setMobileSidebarOpen);

  const content = (
    <aside className={`h-screen border-r border-[var(--border)] bg-[var(--surface)] p-3 transition-all ${collapsed ? 'w-16' : 'w-[260px]'}`}>
      <button className="mb-3 rounded p-2 hover:bg-slate-800" onClick={() => setCollapsed((v) => !v)}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
      {!collapsed ? <h1 className="mb-4 px-2 text-lg font-bold">DCM Service CRM</h1> : null}
      <nav className="space-y-4">
        {groups.map((group) => (
          <div key={group.title}>
            {!collapsed ? <p className="mb-1 px-2 text-xs uppercase text-slate-400">{group.title}</p> : null}
            <div className="space-y-1">
              {group.links.filter((l) => !l.adminOnly || user?.role === 'admin').map((l) => {
                const active = (l.match ?? [l.href]).some((m) => pathname.startsWith(m));

              {group.links.map((l) => {
                const active = pathname.startsWith(l.href);
                return (
                  <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${active ? 'border-l-2 border-blue-500 bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                    <l.icon className="h-4 w-4" /> {!collapsed ? l.label : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {!collapsed && user ? <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg border border-slate-700 p-2"><Avatar name={`${user.first_name} ${user.last_name}`} /><div><p className="text-sm">{user.first_name} {user.last_name}</p><p className="text-xs text-slate-400">{user.role}</p></div></div> : null}
    </aside>
  );

  return (
    <>
      <div className="sticky top-0 hidden md:block">{content}</div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-[260px]" onClick={(e) => e.stopPropagation()}>{content}</div>
        </div>
      ) : null}
    </>
  );
}
