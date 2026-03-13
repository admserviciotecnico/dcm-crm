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
import { getApiErrorMessage } from '@/lib/api/error-message';

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
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'tecnico' } });

  const load = async () => {
    try {
      setUsers(await UsersApi.list());
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron cargar los usuarios') });
    }
  };
  useEffect(() => { void load(); }, []);

  if (me?.role !== 'admin') return <p className="text-sm text-slate-400">Acceso restringido.</p>;

  const onSubmit = async (data: FormData) => {
    try {
      await UsersApi.create(data);
      toast({ type: 'success', message: 'Usuario creado' });
      setOpen(false);
      reset();
      await load();
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo crear el usuario') });
    }
  };

  const toggleActive = async (user: User) => {
    const nextActive = user.active === false;
    setUpdatingUserId(user.id);
    try {
      await UsersApi.setActive(user.id, nextActive);
      setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, active: nextActive } : item));
      toast({ type: 'success', message: nextActive ? 'Usuario activado' : 'Usuario desactivado' });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo actualizar el estado del usuario') });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const updateRole = async (user: User, role: 'admin' | 'tecnico') => {
    if (user.id === me?.id || user.role === role) return;
    setUpdatingUserId(user.id);
    try {
      await UsersApi.setRole(user.id, role);
      setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, role } : item));
      toast({ type: 'success', message: `Rol actualizado a ${role}` });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo actualizar el rol') });
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1><Button onClick={() => setOpen(true)}>+ Nuevo Usuario</Button></div>
      <Table>
        <thead><tr><th className="p-2">Nombre completo</th><th className="p-2">Email</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2" /></tr></thead>
        <tbody>
          {users.map((u) => <tr key={u.id} className="border-t border-slate-700"><td className="p-2">{u.first_name} {u.last_name}</td><td className="p-2">{u.email}</td><td className="p-2"><div className="flex items-center gap-2"><Badge className={u.role === 'admin' ? 'border-blue-500 text-blue-300' : 'border-amber-500 text-amber-300'}>{u.role}</Badge>{u.id !== me?.id ? <Select value={u.role} disabled={updatingUserId === u.id} onChange={(event) => void updateRole(u, event.target.value as 'admin' | 'tecnico')} className="max-w-36"><option value="admin">admin</option><option value="tecnico">tecnico</option></Select> : <span className="text-xs text-slate-400">Usuario actual</span>}</div></td><td className="p-2">{u.active === false ? 'Inactivo' : 'Activo'}</td><td className="p-2"><Button disabled={updatingUserId === u.id || u.id === me?.id} variant="secondary" onClick={() => void toggleActive(u)}>{u.active === false ? 'Activar' : 'Desactivar'}</Button></td></tr>)}
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
