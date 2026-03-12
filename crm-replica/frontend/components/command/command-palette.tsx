'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientsApi, EquipmentsApi, OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { uiStore } from '@/stores/ui-store';
import { Input } from '@/components/ui/input';

type Item = { id: string; label: string; route: string; type: 'order' | 'client' | 'equipment' | 'user' };

export function CommandPalette() {
  const open = uiStore((s) => s.commandOpen);
  const setOpen = uiStore((s) => s.setCommandOpen);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    Promise.all([OrdersApi.list({ page: 1, pageSize: 20 }), ClientsApi.list(), EquipmentsApi.list(), UsersApi.list()]).then(([orders, clients, equipments, users]) => {
      setItems([
        ...orders.items.map((o) => ({ id: o.id, label: `#${o.id.slice(0, 8)} · ${o.client?.nombre_empresa ?? o.client_id}`, route: '/orders', type: 'order' as const })),
        ...clients.slice(0, 20).map((c) => ({ id: c.id, label: c.nombre_empresa, route: `/clients/${c.id}`, type: 'client' as const })),
        ...equipments.slice(0, 20).map((e) => ({ id: e.id, label: `${e.tipo_equipo} · ${e.numero_serie}`, route: `/equipments/${e.id}`, type: 'equipment' as const })),
        ...users.slice(0, 20).map((u) => ({ id: u.id, label: `${u.first_name} ${u.last_name} · ${u.email}`, route: '/users', type: 'user' as const }))
      ]);
    });
  }, [open]);

  const filtered = useMemo(() => items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const grouped = useMemo(
    () => ({
      order: filtered.filter((i) => i.type === 'order'),
      client: filtered.filter((i) => i.type === 'client'),
      equipment: filtered.filter((i) => i.type === 'equipment')
      ,
      user: filtered.filter((i) => i.type === 'user')
    }),
    [filtered]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (filtered.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((v) => (v + 1) % filtered.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((v) => (v - 1 + filtered.length) % filtered.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (!item) return;
        setOpen(false);
        router.push(item.route);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, filtered, open, router, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[260] grid place-items-start bg-black/50 p-8" onClick={() => setOpen(false)}>
      <div className="mx-auto w-full max-w-2xl animate-[fadeSlide_150ms_ease-out] rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar órdenes, clientes, equipos..." />
        <div className="mt-3 max-h-80 space-y-3 overflow-auto">
          {(['order', 'client', 'equipment', 'user'] as const).map((section) => (
            <div key={section}>
              <p className="px-2 text-xs uppercase tracking-wide text-[var(--text-secondary)]">{section === 'order' ? 'Órdenes' : section === 'client' ? 'Clientes' : section === 'equipment' ? 'Equipos' : 'Usuarios'}</p>
              {(grouped[section] || []).map((item) => {
                const idx = filtered.findIndex((f) => f.id === item.id && f.type === item.type);
                const active = idx === activeIndex;
                return (
                <button key={`${item.type}-${item.id}`} onClick={() => { setOpen(false); router.push(item.route); }} className={`block w-full rounded-[8px] px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)] ${active ? 'bg-[var(--bg-surface-hover)]' : ''}`}>
                  {item.label}
                </button>
              );})}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
