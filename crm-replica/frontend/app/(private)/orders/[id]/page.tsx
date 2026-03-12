'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { OrderHistory, ServiceOrder, User } from '@/types/domain';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { RelativeTime } from '@/components/common/relative-time';

export default function OrderByIdPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const load = async () => {
      const [orderData, historyData, usersData] = await Promise.all([OrdersApi.get(params.id), OrdersApi.history(params.id), UsersApi.list()]);
      setOrder(orderData);
      setHistory(historyData);
      setUsers(usersData);
    };
    void load();
  }, [params.id]);

  const techName = (id: string) => {
    const user = users.find((u) => u.id === id);
    return user ? `${user.first_name} ${user.last_name}` : id;
  };

  if (!order) return <p className="text-sm text-slate-400">Cargando orden...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Orden #{order.id.slice(0, 8)}</h1>
      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-slate-400">Cliente</p><p>{order.client?.nombre_empresa ?? order.client_id}</p></div>
          <div><p className="text-slate-400">Estado</p><p>{order.estado}</p></div>
          <div><p className="text-slate-400">Prioridad</p><p>{order.prioridad}</p></div>
          <div><p className="text-slate-400">Fecha</p><p><RelativeTime value={order.fecha_programada} /></p></div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Técnicos asignados</h2>
        <div className="space-y-2">{(order.technicians ?? []).map((t) => <div key={t.technician_id} className="flex items-center gap-2"><Avatar name={techName(t.technician_id)} /><span>{techName(t.technician_id)}</span></div>)}</div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Timeline de auditoría</h2>
        <Timeline>
          {history.map((h) => <TimelineItem key={h.id} title={`${h.usuario?.email ?? 'sistema'} · ${h.campo_modificado ?? 'estado'}`} subtitle={`${h.valor_anterior ?? '-'} → ${h.valor_nuevo ?? '-'} · ${new Date(h.created_at).toISOString()}`} />)}
        </Timeline>
      </Card>

      <Card><h2 className="mb-2 font-semibold">Comentarios</h2><p className="text-sm text-slate-400">Disponible desde el drawer y sincronizado por socket.</p></Card>
      <Card><h2 className="mb-2 font-semibold">Adjuntos</h2><p className="text-sm text-slate-400">Disponible desde el drawer en esta etapa.</p></Card>
    </div>
  );
}
