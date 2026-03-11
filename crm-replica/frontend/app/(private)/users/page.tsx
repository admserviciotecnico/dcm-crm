'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UsersApi } from '@/lib/api/endpoints';
import { User } from '@/types/domain';
import { authStore } from '@/stores/auth-store';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { appStore } from '@/stores/app-store';

const schema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'tecnico'])
});
type FormData = z.infer<typeof schema>;

export default function UsersPage() {
  const me = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'tecnico' } });

  const load = async () => setUsers(await UsersApi.list());
  useEffect(() => { void load(); }, []);

  if (me?.role !== 'admin') return <p className="text-sm text-slate-400">Acceso restringido.</p>;

  const onSubmit = async (data: FormData) => {
    await UsersApi.create(data);
    toast({ type: 'success', message: 'Usuario creado' });
    setOpen(false);
    reset();
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Usuarios</h1><Button onClick={() => setOpen(true)}>+ Nuevo Usuario</Button></div>
      <Table>
        <thead><tr><th className="p-2">Nombre completo</th><th className="p-2">Email</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2" /></tr></thead>
        <tbody>
          {users.map((u) => <tr key={u.id} className="border-t border-slate-700"><td className="p-2">{u.first_name} {u.last_name}</td><td className="p-2">{u.email}</td><td className="p-2"><Badge className={u.role === 'admin' ? 'border-blue-500 text-blue-300' : 'border-amber-500 text-amber-300'}>{u.role}</Badge></td><td className="p-2">{u.active === false ? 'Inactivo' : 'Activo'}</td><td className="p-2"><Button variant="secondary" onClick={async () => { await UsersApi.setActive(u.id, u.active === false); setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, active: !(x.active === false) } : x)); }}>{u.active === false ? 'Activar' : 'Desactivar'}</Button></td></tr>)}
        </tbody>
      </Table>

      <Modal open={open} title="Nuevo usuario" onClose={() => setOpen(false)}>
        <form className="space-y-2" onSubmit={handleSubmit(onSubmit)}>
          <Input placeholder="Nombre" {...register('first_name')} />
          <Input placeholder="Apellido" {...register('last_name')} />
          <Input placeholder="Email" {...register('email')} />
          <Input type="password" placeholder="Contraseña" {...register('password')} />
          <Select {...register('role')}><option value="admin">Admin</option><option value="tecnico">Técnico</option></Select>
          {errors.email ? <p className="text-xs text-red-300">{errors.email.message}</p> : null}
          <div className="flex justify-end"><Button disabled={isSubmitting} type="submit">Guardar</Button></div>
        </form>
      </Modal>
    </div>
  );
}
