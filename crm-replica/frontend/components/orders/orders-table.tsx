'use client';

import { memo } from 'react';
 codex/fix-cors-error-in-backend-izagw1
import { Copy, Eye, ExternalLink, Pencil, XCircle } from 'lucide-react';

import { Copy, Eye, Pencil, XCircle } from 'lucide-react';
 main
import { ServiceOrder, User, OrderStatus } from '@/types/domain';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { Avatar } from '@/components/ui/avatar';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
 codex/fix-cors-error-in-backend-izagw1
import Link from 'next/link';
import { RelativeTime } from '@/components/common/relative-time';

 main

type Props = {
  rows: ServiceOrder[];
  users: User[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClick: (row: ServiceOrder) => void;
  onStatusQuickChange: (order: ServiceOrder, status: OrderStatus) => void;
};

function OrdersTableComponent({ rows, users, selectedIds, onToggleSelect, onToggleSelectAll, onClick, onStatusQuickChange }: Props) {
  const getTechName = (techId: string) => {
    const user = users.find((u) => u.id === techId);
    return user ? `${user.first_name} ${user.last_name}` : techId;
  };

  return (
    <Table>
      <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
        <tr>
          <th className="p-2"><input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={onToggleSelectAll} /></th>
          <th className="p-2">ID</th><th className="p-2">Cliente</th><th className="p-2">Estado</th><th className="p-2">Prioridad</th><th className="p-2">Técnicos</th><th className="p-2">Fecha</th><th className="p-2">Demorado</th><th className="p-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => {
          const techs = o.technicians ?? [];
          const visible = techs.slice(0, 3);
          const extra = Math.max(0, techs.length - visible.length);
          const checked = selectedIds.includes(o.id);
          return (
            <tr key={o.id} className={`group cursor-pointer border-t border-slate-700 hover:bg-slate-800/50 ${o.deleted_at ? 'opacity-50 line-through' : ''}`}>
              <td className="p-2"><input type="checkbox" checked={checked} onChange={() => onToggleSelect(o.id)} /></td>
              <td className="mono p-2"><button className="inline-flex items-center gap-1" onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(o.id); }}><span>#{o.id.slice(0, 8)}</span><Copy size={12} /></button></td>
              <td className="p-2">
                <div className="relative" onClick={() => onClick(o)}>
                  {o.client?.nombre_empresa ?? o.client_id}
                  <div className="pointer-events-none absolute left-0 top-6 z-10 hidden min-w-44 rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-300 group-hover:block">Contacto cliente y métricas rápidas</div>
                </div>
              </td>
              <td className="p-2" onClick={() => onClick(o)}><StatusBadge value={o.estado} /></td>
              <td className="p-2" onClick={() => onClick(o)}><PriorityBadge value={o.prioridad} /></td>
              <td className="p-2" onClick={() => onClick(o)}><div className="flex items-center -space-x-2">{visible.map((t) => <Avatar key={t.technician_id} name={getTechName(t.technician_id)} className="h-7 w-7 border border-slate-900" />)}{extra > 0 ? <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-900 bg-slate-700 text-xs">+{extra}</span> : null}</div></td>
 codex/fix-cors-error-in-backend-izagw1
              <td className="p-2" onClick={() => onClick(o)}><RelativeTime value={o.fecha_programada} /></td>

              <td className="p-2" onClick={() => onClick(o)}>{o.fecha_programada ? new Date(o.fecha_programada).toLocaleDateString() : '-'}</td>
 main
              <td className="p-2" onClick={() => onClick(o)}>{o.delayed ? <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300">⚠ Demorado</span> : '-'}</td>
              <td className="p-2">
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => onClick(o)}><Eye size={14} /></Button>
                  <Button variant="ghost" onClick={() => onStatusQuickChange(o, 'service_programado')}><Pencil size={14} /></Button>
 codex/fix-cors-error-in-backend-izagw1
                  <Link href={`/orders/${o.id}`} className="inline-flex items-center rounded-lg p-2 hover:bg-slate-700"><ExternalLink size={14} /></Link>

 main
                  <Button variant="ghost" onClick={() => onStatusQuickChange(o, 'cancelado')}><XCircle size={14} /></Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export const OrdersTable = memo(OrdersTableComponent);
