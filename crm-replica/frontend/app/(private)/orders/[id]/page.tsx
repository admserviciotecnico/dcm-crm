'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { OrderHistory, ServiceOrder, User } from '@/types/domain';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { RelativeTime } from '@/components/common/relative-time';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge, PriorityBadge } from '@/components/common/badges';
import { SlaBadge } from '@/components/common/sla-badge';
import { getOrderHistoryFieldLabel, renderOrderHistoryValue } from '@/lib/order-history';
import { resolveActorName } from '@/lib/actor-name';

type HistoryFilter = 'all' | 'estado' | 'prioridad' | 'fecha_programada' | 'technicians';

export default function OrderByIdPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  useEffect(() => {
    const load = async () => {
      const [orderData, historyData, usersData] = await Promise.all([OrdersApi.get(params.id), OrdersApi.history(params.id), UsersApi.list()]);
      setOrder(orderData);
      setHistory(historyData);
      setUsers(usersData);
    };
    void load();
  }, [params.id]);

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const filteredHistory = useMemo(() => filter === 'all' ? history : history.filter((entry) => entry.campo_modificado === filter), [filter, history]);

  const techName = (id: string) => {
    const assignedUser = users.find((u) => u.id === id);
    return assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : id;
  };

  if (!order) return <p className="text-sm text-[var(--text-secondary)]">Cargando orden...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orden #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-[var(--text-secondary)]">Historial completo de auditoría y seguimiento operativo.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={order.estado} />
          <PriorityBadge value={order.prioridad} />
          <SlaBadge status={order.sla_status} slaDeadline={order.sla_deadline} />
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-[var(--text-secondary)]">Cliente</p><p>{order.client?.nombre_empresa ?? order.client_id}</p></div>
          <div><p className="text-[var(--text-secondary)]">Estado</p><p>{order.estado}</p></div>
          <div><p className="text-[var(--text-secondary)]">Prioridad</p><p>{order.prioridad}</p></div>
          <div><p className="text-[var(--text-secondary)]">Fecha</p><p><RelativeTime value={order.fecha_programada} /></p></div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Técnicos asignados</h2>
        <div className="space-y-2">{(order.technicians ?? []).map((t) => <div key={t.technician_id} className="flex items-center gap-2"><Avatar name={techName(t.technician_id)} /><span>{techName(t.technician_id)}</span></div>)}</div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Historial de auditoría</h2>
            <Badge className="border-cyan-500 text-cyan-300">{filteredHistory.length} registros</Badge>
          </div>
          <div className="w-full md:max-w-xs">
            <Select value={filter} onChange={(event) => setFilter(event.target.value as HistoryFilter)}>
              <option value="all">Todos los cambios</option>
              <option value="estado">Solo estados</option>
              <option value="prioridad">Solo prioridad</option>
              <option value="fecha_programada">Solo fecha</option>
              <option value="technicians">Solo técnicos</option>
            </Select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState title="Sin historial para mostrar" subtitle="Todavía no hay cambios registrados para este filtro." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className="p-2">Fecha</th>
                <th className="p-2">Usuario</th>
                <th className="p-2">Campo modificado</th>
                <th className="p-2">Valor anterior</th>
                <th className="p-2">Valor nuevo</th>
                <th className="p-2">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((entry) => (
                <tr key={entry.id} className="border-t border-[var(--border)] align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="p-2">{entry.actor_name || resolveActorName(entry.usuario)}</td>
                  <td className="p-2">{getOrderHistoryFieldLabel(entry.campo_modificado)}</td>
                  <td className="p-2">{renderOrderHistoryValue(entry, entry.valor_anterior, usersById)}</td>
                  <td className="p-2">{renderOrderHistoryValue(entry, entry.valor_nuevo, usersById)}</td>
                  <td className="p-2">{entry.comentario || <span className="text-[var(--text-secondary)]">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card><h2 className="mb-2 font-semibold">Comentarios</h2><p className="text-sm text-[var(--text-secondary)]">Disponible desde el drawer y sincronizado por socket.</p></Card>
      <Card><h2 className="mb-2 font-semibold">Adjuntos</h2><p className="text-sm text-[var(--text-secondary)]">Disponible desde el drawer en esta etapa.</p></Card>
    </div>
  );
}
