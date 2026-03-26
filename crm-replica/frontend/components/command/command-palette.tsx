'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchApi } from '@/lib/api/endpoints';
import { uiStore } from '@/stores/ui-store';
import { Input } from '@/components/ui/input';

type Item = { id: string; label: string; route: string; type: 'order' | 'client' | 'equipment' | 'user'; meta?: string };

const SECTION_LABELS = {
  order: 'Órdenes',
  client: 'Clientes',
  equipment: 'Equipos',
  user: 'Usuarios'
} as const;

export function CommandPalette() {
  const open = uiStore((s) => s.commandOpen);
  const setOpen = uiStore((s) => s.setCommandOpen);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      SearchApi.global(trimmedQuery, 12)
        .then((results) => {
          if (cancelled) return;
          setItems([
            ...results.orders.map((order) => ({
              id: order.id,
              label: `#${order.id.slice(0, 8)} · ${order.client?.nombre_empresa ?? order.client_id}`,
              meta: `${order.estado} · ${order.prioridad}`,
              route: `/orders/${order.id}`,
              type: 'order' as const
            })),
            ...results.clients.map((client) => ({
              id: client.id,
              label: client.nombre_empresa,
              meta: client.persona_contacto ?? client.email ?? 'Cliente',
              route: `/clients/${client.id}`,
              type: 'client' as const
            })),
            ...results.equipments.map((equipment) => ({
              id: equipment.id,
              label: `${equipment.tipo_equipo} · ${equipment.numero_serie}`,
              meta: equipment.modelo ?? equipment.estado_actual,
              route: `/equipments/${equipment.id}`,
              type: 'equipment' as const
            })),
            ...results.users.map((user) => ({
              id: user.id,
              label: `${user.first_name} ${user.last_name}`.trim(),
              meta: user.email,
              route: '/users',
              type: 'user' as const
            }))
          ]);
        })
        .catch(() => {
          if (!cancelled) setItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, query]);

  const filtered = useMemo(() => items, [items]);

  const grouped = useMemo(
    () => ({
      order: filtered.filter((i) => i.type === 'order'),
      client: filtered.filter((i) => i.type === 'client'),
      equipment: filtered.filter((i) => i.type === 'equipment'),
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
        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar órdenes, clientes, equipos o usuarios..." />
        <div className="mt-2 text-xs text-[var(--text-secondary)]">Escribí al menos 2 caracteres para usar la búsqueda global.</div>
        <div className="mt-3 max-h-80 space-y-3 overflow-auto">
          {loading ? <p className="px-2 text-sm text-[var(--text-secondary)]">Buscando resultados...</p> : null}
          {!loading && query.trim().length >= 2 && filtered.length === 0 ? <p className="px-2 text-sm text-[var(--text-secondary)]">No encontramos resultados para “{query.trim()}”.</p> : null}
          {(['order', 'client', 'equipment', 'user'] as const).map((section) => (
            grouped[section].length > 0 ? (
              <div key={section}>
                <p className="px-2 text-xs uppercase tracking-wide text-[var(--text-secondary)]">{SECTION_LABELS[section]}</p>
                {grouped[section].map((item) => {
                  const idx = filtered.findIndex((f) => f.id === item.id && f.type === item.type);
                  const active = idx === activeIndex;
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => { setOpen(false); router.push(item.route); }}
                      className={`block w-full rounded-[8px] px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--bg-surface-hover)] ${active ? 'bg-[var(--bg-surface-hover)]' : ''}`}
                    >
                      <div className="font-medium text-[var(--text-primary)]">{item.label}</div>
                      {item.meta ? <div className="text-xs text-[var(--text-secondary)]">{item.meta}</div> : null}
                    </button>
                  );
                })}
              </div>
            ) : null
          ))}
        </div>
      </div>
    </div>
  );
}
