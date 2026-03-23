'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Search } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { RelativeTime } from '@/components/common/relative-time';
import { EmptyState } from '@/components/common/empty-state';
import { useDebouncedValue } from '@/hooks/use-debounced';

const schema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'tecnico'])
});
type FormData = z.infer<typeof schema>;

const roleBadgeClasses = {
  admin: 'border-blue-200 bg-blue-100 text-blue-700',
  tecnico: 'border-amber-200 bg-amber-100 text-amber-700'
} as const;

const stateBadgeClasses = {
  active: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  inactive: 'border-red-200 bg-red-100 text-red-700'
} as const;

export default function UsersPage() {
  const me = authStore((s) => s.user);
  const toast = appStore((s) => s.pushToast);
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 200);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'tecnico' } });

  const load = async () => {
    try {
      setUsers(await UsersApi.list());
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudieron cargar los usuarios') });
    }
  };
  useEffect(() => { void load(); }, []);

  const filteredUsers = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) => [user.first_name, user.last_name, user.email, user.role].some((value) => value?.toLowerCase().includes(normalized)));
  }, [debouncedQuery, users]);

  const counters = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.active !== false).length,
    inactive: users.filter((user) => user.active === false).length
  }), [users]);

  if (me?.role !== 'admin') return <p className="text-sm text-[var(--text-secondary)]">Acceso restringido.</p>;

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

  const confirmToggleActive = async () => {
    if (!confirmUser) return;
    const nextActive = confirmUser.active === false;
    setUpdatingUserId(confirmUser.id);
    try {
      await UsersApi.setActive(confirmUser.id, nextActive);
      setUsers((prev) => prev.map((item) => item.id === confirmUser.id ? { ...item, active: nextActive } : item));
      toast({ type: 'success', message: nextActive ? 'Usuario activado' : 'Usuario desactivado' });
      setConfirmUser(null);
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
    <ErrorBoundary>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
            <p className="text-sm text-[var(--text-secondary)]">Gestión operativa mínima de usuarios administrativos y técnicos.</p>
          </div>
          <Button onClick={() => setOpen(true)}>+ Nuevo Usuario</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-xs text-[var(--text-secondary)]">Total usuarios</p><p className="mt-2 text-2xl font-bold">{counters.total}</p></Card>
          <Card><p className="text-xs text-[var(--text-secondary)]">Activos</p><p className="mt-2 text-2xl font-bold text-emerald-600">{counters.active}</p></Card>
          <Card><p className="text-xs text-[var(--text-secondary)]">Inactivos</p><p className="mt-2 text-2xl font-bold text-red-600">{counters.inactive}</p></Card>
        </div>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="relative block w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, email o rol..." className="pl-9" />
            </label>
            <Button variant="secondary" onClick={() => setQuery('')}>Limpiar</Button>
          </div>
        </Card>

        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No hay usuarios para mostrar"
            subtitle={debouncedQuery ? 'Probá con otra búsqueda o limpiá los filtros.' : 'Creá el primer usuario para comenzar.'}
            action={!debouncedQuery ? <Button onClick={() => setOpen(true)}>Crear usuario</Button> : undefined}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className="p-2">Nombre completo</th>
                <th className="p-2">Email</th>
                <th className="p-2">Rol</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Última actividad</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const lastActivity = u.updated_at ?? u.created_at ?? null;
                return (
                  <tr key={u.id} className="border-t border-[var(--border)]">
                    <td className="p-2 font-medium">{u.first_name} {u.last_name}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Badge className={roleBadgeClasses[u.role]}>{u.role}</Badge>
                        {u.id !== me?.id ? (
                          <Select value={u.role} disabled={updatingUserId === u.id} onChange={(event) => void updateRole(u, event.target.value as 'admin' | 'tecnico')} className="max-w-36">
                            <option value="admin">admin</option>
                            <option value="tecnico">tecnico</option>
                          </Select>
                        ) : <span className="text-xs text-[var(--text-secondary)]">Usuario actual</span>}
                      </div>
                    </td>
                    <td className="p-2"><Badge className={u.active === false ? stateBadgeClasses.inactive : stateBadgeClasses.active}>{u.active === false ? 'Inactivo' : 'Activo'}</Badge></td>
                    <td className="p-2 text-sm">{lastActivity ? <RelativeTime value={lastActivity} /> : <span className="text-[var(--text-secondary)]">Sin actividad reciente</span>}</td>
                    <td className="p-2">
                      <Button disabled={updatingUserId === u.id || u.id === me?.id} variant="secondary" onClick={() => setConfirmUser(u)}>{u.active === false ? 'Activar' : 'Desactivar'}</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}

        <Modal open={open} title="Nuevo usuario" onClose={() => setOpen(false)}>
          <form className="space-y-2" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Nombre</label>
              <Input placeholder="Nombre" {...register('first_name')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Apellido</label>
              <Input placeholder="Apellido" {...register('last_name')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Email</label>
              <Input placeholder="Email" {...register('email')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Contraseña</label>
              <Input type="password" placeholder="Contraseña" {...register('password')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Rol</label>
              <Select {...register('role')}>
                <option value="admin">Admin</option>
                <option value="tecnico">Técnico</option>
              </Select>
            </div>
            {errors.email ? <p className="text-xs text-red-300">{errors.email.message}</p> : null}
            <div className="flex justify-end">
              <Button disabled={isSubmitting} type="submit">Guardar</Button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          open={!!confirmUser}
          title={confirmUser?.active === false ? 'Activar usuario' : 'Desactivar usuario'}
          message={confirmUser ? `${confirmUser.active === false ? 'Se restablecerá' : 'Se retirará'} el acceso de ${confirmUser.first_name} ${confirmUser.last_name} al sistema hasta nuevo cambio.` : ''}
          onCancel={() => { if (!updatingUserId) setConfirmUser(null); }}
          onConfirm={() => { void confirmToggleActive(); }}
          confirmDisabled={!!updatingUserId}
          cancelDisabled={!!updatingUserId}
        />
      </div>
    </ErrorBoundary>
  );
}
