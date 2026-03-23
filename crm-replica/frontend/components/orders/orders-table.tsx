'use client';

import { memo, useState } from 'react';
import { Copy, Eye, ExternalLink, MoreHorizontal, Pencil, XCircle } from 'lucide-react';

import { ServiceOrder, User, OrderStatus } from '@/types/domain';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { SlaBadge } from '@/components/common/sla-badge';
import { Avatar } from '@/components/ui/avatar';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { RelativeTime } from '@/components/common/relative-time';
import { Dropdown } from '@/components/ui/dropdown';
import { ConfirmModal } from '@/components/common/confirm-modal';

type Props = {
  rows: ServiceOrder[];
  users: User[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onClick: (row: ServiceOrder) => void;
  onStatusQuickChange: (order: ServiceOrder, status: OrderStatus) => Promise<void> | void;
};

function OrdersTableComponent({ rows, users, selectedIds, onToggleSelect, onToggleSelectAll, onClick, onStatusQuickChange }: Props) {
  const [confirmOrder, setConfirmOrder] = useState<ServiceOrder | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const getTechName = (techId: string) => {
    const user = users.find((u) => u.id === techId);
    return user ? `${user.first_name} ${user.last_name}` : techId;
  };

  const requestCancel = (order: ServiceOrder) => setConfirmOrder(order);

  const confirmCancel = async () => {
    if (!confirmOrder) return;
    setCancelLoading(true);
    try {
      await onStatusQuickChange(confirmOrder, 'cancelado');
      setConfirmOrder(null);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <>
      <Table>
      <thead className="text-left text-xs uppercase text-[var(--text-secondary)]">
        <tr>
          <th className="p-2"><input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={onToggleSelectAll} /></th>
          <th className="p-2">ID</th><th className="p-2">Cliente</th><th className="p-2">Estado</th><th className="p-2">Prioridad</th><th className="p-2">SLA</th><th className="p-2">Técnicos</th><th className="p-2">Fecha</th><th className="p-2">Demorado</th><th className="p-2 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => {
          const techs = o.technicians ?? [];
          const visible = techs.slice(0, 3);
          const extra = Math.max(0, techs.length - visible.length);
          const checked = selectedIds.includes(o.id);
          return (
            <tr key={o.id} className={`group cursor-pointer border-t border-[var(--border)] hover:bg-[var(--bg-surface-hover)] ${checked ? 'bg-blue-500/10' : ''} ${o.deleted_at ? 'opacity-50 line-through' : ''}`}>
              <td className="p-2"><input type="checkbox" checked={checked} onChange={() => onToggleSelect(o.id)} /></td>
              <td className="mono p-2"><button className="inline-flex items-center gap-1" onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(o.id); }}><span>#{o.id.slice(0, 8)}</span><Copy size={12} /></button></td>
              <td className="p-2">
                <div className="relative">
                  {o.client?.nombre_empresa ?? o.client_id}
                  <div className="pointer-events-none absolute left-0 top-6 z-10 hidden min-w-44 rounded border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-xs text-[var(--text-secondary)] group-hover:block">Contacto cliente y métricas rápidas</div>
                </div>
              </td>
              <td className="p-2" onClick={() => onClick(o)}><StatusBadge value={o.estado} /></td>
              <td className="p-2" onClick={() => onClick(o)}><PriorityBadge value={o.prioridad} /></td>
              <td className="p-2" onClick={() => onClick(o)}><SlaBadge status={o.sla_status} slaDeadline={o.sla_deadline} /></td>
              <td className="p-2" onClick={() => onClick(o)}><div className="flex items-center">{visible.map((t, idx) => <Avatar key={t.technician_id} name={getTechName(t.technician_id)} className={`h-7 w-7 border-2 border-white ${idx > 0 ? '-ml-1.5' : ''}`} />)}{extra > 0 ? <span className="ml-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[var(--bg-surface-muted)] text-xs">+{extra}</span> : null}</div></td>
              <td className="p-2" onClick={() => onClick(o)}><RelativeTime value={o.fecha_programada} /></td>
              <td className="p-2" onClick={() => onClick(o)}>{o.delayed ? <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300">⚠ Demorado</span> : '-'}</td>
              <td className="p-2">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" onClick={() => onClick(o)} title="Ver detalle"><Eye size={14} /></Button>
                  <Button variant="ghost" onClick={() => onStatusQuickChange(o, 'service_programado')} title="Editar / Programar"><Pencil size={14} /></Button>
                  <Link href={`/orders/${o.id}`} className="inline-flex items-center rounded-lg p-2 hover:bg-[var(--bg-surface-hover)]" title="Abrir página"><ExternalLink size={14} /></Link>
                  <Button variant="ghost" onClick={() => requestCancel(o)} title="Cancelar"><XCircle size={14} /></Button>
                  <Dropdown trigger={<Button variant="ghost"><MoreHorizontal size={16} /></Button>}>
                    <button className="block w-full rounded-[8px] px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface-hover)]" onClick={() => onClick(o)}>Ver detalle</button>
                    <button className="block w-full rounded-[8px] px-3 py-2 text-left text-sm hover:bg-[var(--bg-surface-hover)]" onClick={() => onStatusQuickChange(o, 'service_programado')}>Marcar programada</button>
                    <button className="block w-full rounded-[8px] px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => requestCancel(o)}>Cancelar orden</button>
                  </Dropdown>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
      </Table>
      <ConfirmModal
        open={!!confirmOrder}
        title="Cancelar orden"
        message={confirmOrder ? `¿Cancelar la orden #${confirmOrder.id.slice(0, 8)}?` : ''}
        onCancel={() => { if (!cancelLoading) setConfirmOrder(null); }}
        onConfirm={() => { void confirmCancel(); }}
        confirmDisabled={cancelLoading}
        cancelDisabled={cancelLoading}
      />
    </>
  );
}

export const OrdersTable = memo(OrdersTableComponent);
