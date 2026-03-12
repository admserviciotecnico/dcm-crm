'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClientsApi, EquipmentsApi } from '@/lib/api/endpoints';
import { Equipment } from '@/types/domain';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const schema = z.object({ tipo_equipo: z.string().min(2), modelo: z.string().optional(), numero_serie: z.string().min(2), client_id: z.string().min(1), estado_actual: z.enum(['operativo', 'mantenimiento', 'fuera_servicio', 'revision']) });
type FormData = z.infer<typeof schema>;

export default function EquipmentsPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [clients, setClients] = useState<{ id: string; nombre_empresa: string }[]>([]);
  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [edit, setEdit] = useState<Equipment | null>(null);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { estado_actual: 'operativo' } });

  const load = async () => {
    const [eqs, cs] = await Promise.all([EquipmentsApi.list(), ClientsApi.list()]);
    setItems(eqs);
    setClients(cs.map((c) => ({ id: c.id, nombre_empresa: c.nombre_empresa })));
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: FormData) => {
    if (edit) await EquipmentsApi.update(edit.id, data);
    else await EquipmentsApi.create(data);
    setOpen(false); setEdit(null); reset(); load();
  };

  const statusColor = (s: string) => s === 'operativo' ? 'text-emerald-300' : s === 'mantenimiento' ? 'text-yellow-300' : s === 'fuera_servicio' ? 'text-red-300' : 'text-orange-300';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold tracking-tight">Equipos instalados</h1><Button onClick={() => { setEdit(null); reset(); setOpen(true); }}>Nuevo equipo</Button></div>
      {!items.length ? <EmptyState variant="equipments" title="No hay equipos" subtitle="Asocia equipos a clientes y ubicaciones." /> : (
        <Table>
          <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400"><tr><th className="p-2">Tipo</th><th className="p-2">Modelo</th><th className="p-2">Número serie</th><th className="p-2">Cliente</th><th className="p-2">Ubicación</th><th className="p-2">Estado</th><th className="p-2" /></tr></thead>
          <tbody>{items.map((eq) => <tr key={eq.id} className="border-t border-slate-700"><td className="p-2"><Link className="text-blue-300 hover:underline" href={`/equipments/${eq.id}`}>{eq.tipo_equipo}</Link></td><td className="p-2">{eq.modelo ?? '-'}</td><td className="mono p-2">{eq.numero_serie}</td><td className="p-2">{clients.find((c) => c.id === eq.client_id)?.nombre_empresa ?? eq.client_id}</td><td className="p-2">-</td><td className={`p-2 ${statusColor(eq.estado_actual)}`}>{eq.estado_actual}</td><td className="p-2"><div className="flex gap-2"><Button variant="ghost" onClick={() => { setEdit(eq); reset(eq as unknown as FormData); setOpen(true); }}>Editar</Button><Button variant="danger" onClick={() => setToDelete(eq)}>Eliminar</Button></div></td></tr>)}</tbody>
        </Table>
      )}

      <Modal open={open} title={edit ? 'Editar equipo' : 'Nuevo equipo'} onClose={() => setOpen(false)}>
        <form className="space-y-2" onSubmit={handleSubmit(onSubmit)}>
          <Input placeholder="Tipo" {...register('tipo_equipo')} />
          <Input placeholder="Modelo" {...register('modelo')} />
          <Input placeholder="Número serie" {...register('numero_serie')} />
          <Select {...register('client_id')}><option value="">Cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre_empresa}</option>)}</Select>
          <Select {...register('estado_actual')}><option value="operativo">operativo</option><option value="mantenimiento">mantenimiento</option><option value="fuera_servicio">fuera_servicio</option><option value="revision">revision</option></Select>
          <div className="flex justify-end"><Button type="submit">Guardar</Button></div>
        </form>
      </Modal>

      <ConfirmModal open={!!toDelete} title="Eliminar equipo" message="Se realizará soft delete." onCancel={() => setToDelete(null)} onConfirm={async () => { if (!toDelete) return; await EquipmentsApi.remove(toDelete.id); setToDelete(null); load(); }} />
    </div>
  );
}
