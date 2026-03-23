'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthApi } from '@/lib/api/endpoints';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(1, 'Requerido')
}).refine((value) => value.password === value.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password']
});

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const toast = appStore((s) => s.pushToast);
  const router = useRouter();
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await AuthApi.resetPassword({ token, password: data.password });
      toast({ type: 'success', message: 'Contraseña actualizada correctamente' });
      router.replace('/login');
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo restablecer la contraseña') });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md space-y-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
      <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
      <div>
        <Input type="password" placeholder="Nueva contraseña" {...form.register('password')} />
        {form.formState.errors.password ? <p className="mt-1 text-xs text-red-400">{form.formState.errors.password.message}</p> : null}
      </div>
      <div>
        <Input type="password" placeholder="Confirmar contraseña" {...form.register('confirm_password')} />
        {form.formState.errors.confirm_password ? <p className="mt-1 text-xs text-red-400">{form.formState.errors.confirm_password.message}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Actualizando...' : 'Cambiar contraseña'}</Button>
      <Link href="/login" className="block text-center text-xs text-[var(--text-secondary)] hover:text-[var(--primary)]">Volver al login</Link>
    </form>
  );
}
