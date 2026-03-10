'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClientsApi } from '@/lib/api/endpoints';
import { Client } from '@/types/domain';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

const schema = z.object({ nombre_empresa: z.string().min(2), email: z.string().email(), telefono: z.string().optional(), persona_contacto: z.string().optional(), fecha_vencimiento_documentacion: z.string().optional() });
type FormData = z.infer<typeof schema>;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [edit, setEdit] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = () => ClientsApi.list().then(setClients);
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: FormData) => {
    if (edit) await ClientsApi.update(edit.id, data);
    else await ClientsApi.create(data);
    setOpen(false);
    setEdit(null);
    reset();
    load();
  };

  const expiryBadge = (date?: string) => {
    if (!date) return <span className="text-slate-400">-</span>;
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300">Vencido</span>;
    if (diff < 30) return <span className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-300">&lt;30 días</span>;
    return <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Vigente</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Clientes industriales</h1><Button onClick={() => { setEdit(null); reset(); setOpen(true); }}>Nuevo cliente</Button></div>
      {!clients.length ? <EmptyState variant="clients" title="No hay clientes" subtitle="Registra empresas para iniciar operaciones." /> : (
        <Table>
          <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400"><tr><th className="p-2">Empresa</th><th className="p-2">Contacto</th><th className="p-2">Email</th><th className="p-2">Teléfono</th><th className="p-2">Vencimiento documentación</th><th className="p-2">Estado</th><th className="p-2" /></tr></thead>
          <tbody>
            {clients.map((c) => <tr key={c.id} className="border-t border-slate-700"><td className="p-2"><Link className="text-blue-300 hover:underline" href={`/clients/${c.id}`}>{c.nombre_empresa}</Link></td><td className="p-2">{c.persona_contacto ?? '-'}</td><td className="p-2">{c.email}</td><td className="p-2">{c.telefono ?? '-'}</td><td className="p-2">{expiryBadge(c.fecha_vencimiento_documentacion)}</td><td className="p-2">{c.deleted_at ? 'Inactivo' : 'Activo'}</td><td className="p-2"><div className="flex gap-2"><Button variant="ghost" onClick={() => { setEdit(c); reset(c); setOpen(true); }}>Editar</Button><Button variant="danger" onClick={() => setToDelete(c)}>Eliminar</Button></div></td></tr>)}
          </tbody>
        </Table>
      )}

      <Modal open={open} title={edit ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setOpen(false)}>
        <form className="space-y-2" onSubmit={handleSubmit(onSubmit)}>
          <Input placeholder="Empresa" {...register('nombre_empresa')} />
          <Input placeholder="Contacto" {...register('persona_contacto')} />
          <Input placeholder="Email" {...register('email')} />
          <Input placeholder="Teléfono" {...register('telefono')} />
          <Input type="date" {...register('fecha_vencimiento_documentacion')} />
          <div className="flex justify-end"><Button type="submit">Guardar</Button></div>
        </form>
      </Modal>

      <ConfirmModal open={!!toDelete} title="Eliminar cliente" message="Se realizará soft delete." onCancel={() => setToDelete(null)} onConfirm={async () => { if (!toDelete) return; await ClientsApi.remove(toDelete.id); setToDelete(null); load(); }} />
    </div>
  );
}
