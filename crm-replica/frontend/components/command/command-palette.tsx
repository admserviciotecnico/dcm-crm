'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientsApi, EquipmentsApi, OrdersApi } from '@/lib/api/endpoints';
import { uiStore } from '@/stores/ui-store';
import { Input } from '@/components/ui/input';

type Item = { id: string; label: string; route: string; type: 'order' | 'client' | 'equipment' };

export function CommandPalette() {
  const open = uiStore((s) => s.commandOpen);
  const setOpen = uiStore((s) => s.setCommandOpen);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    Promise.all([OrdersApi.list({ page: 1, pageSize: 20 }), ClientsApi.list(), EquipmentsApi.list()]).then(([orders, clients, equipments]) => {
      setItems([
        ...orders.items.map((o) => ({ id: o.id, label: `#${o.id.slice(0, 8)} · ${o.client?.nombre_empresa ?? o.client_id}`, route: '/orders', type: 'order' as const })),
        ...clients.slice(0, 20).map((c) => ({ id: c.id, label: c.nombre_empresa, route: `/clients/${c.id}`, type: 'client' as const })),
        ...equipments.slice(0, 20).map((e) => ({ id: e.id, label: `${e.tipo_equipo} · ${e.numero_serie}`, route: `/equipments/${e.id}`, type: 'equipment' as const }))
      ]);
    });
  }, [open]);

  const filtered = useMemo(() => items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const grouped = useMemo(
    () => ({
      order: filtered.filter((i) => i.type === 'order'),
      client: filtered.filter((i) => i.type === 'client'),
      equipment: filtered.filter((i) => i.type === 'equipment')
    }),
    [filtered]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[260] grid place-items-start bg-black/50 p-8" onClick={() => setOpen(false)}>
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-slate-600 bg-slate-900 p-3" onClick={(e) => e.stopPropagation()}>
        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar órdenes, clientes, equipos..." />
        <div className="mt-2 max-h-80 space-y-3 overflow-auto">
          {(['order', 'client', 'equipment'] as const).map((section) => (
            <div key={section}>
              <p className="px-2 text-xs uppercase text-slate-400">{section === 'order' ? 'Órdenes' : section === 'client' ? 'Clientes' : 'Equipos'}</p>
              {(grouped[section] || []).map((item) => (
                <button key={`${item.type}-${item.id}`} onClick={() => { setOpen(false); router.push(item.route); }} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-800">
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
