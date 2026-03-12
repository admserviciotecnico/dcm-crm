'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authStore } from '@/stores/auth-store';
import { UsersApi } from '@/lib/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { appStore } from '@/stores/app-store';

const schema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  phone: z.string().optional()
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = authStore((s) => s.user);
  const setUser = authStore((s) => s.setUser);
  const pushToast = appStore((s) => s.pushToast);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user) {
      reset({ first_name: user.first_name, last_name: user.last_name, phone: user.phone ?? '' });
    }
  }, [reset, user]);

  const onSubmit = async (values: FormData) => {
    await UsersApi.updateMe(values);
    const me = await UsersApi.me();
    setUser(me);
    pushToast({ type: 'success', message: 'Perfil actualizado' });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mi Perfil</h1>
      <p className="text-slate-400">{user?.email}</p>
      <form className="max-w-md space-y-2" onSubmit={handleSubmit(onSubmit)}>
        <Input placeholder="Nombre" {...register('first_name')} />
        <Input placeholder="Apellido" {...register('last_name')} />
        <Input placeholder="Teléfono" {...register('phone')} />
        <Button disabled={isSubmitting} type="submit">Guardar cambios</Button>
      </form>
    </div>
  );
}
