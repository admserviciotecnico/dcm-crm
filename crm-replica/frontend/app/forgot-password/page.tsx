'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthApi } from '@/lib/api/endpoints';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  email: z.string().email('Email inválido')
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const toast = appStore((s) => s.pushToast);
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await AuthApi.forgotPassword(data);
      toast({ type: 'success', message: 'Si el email existe, recibirás un enlace de recuperación.' });
      form.reset({ email: '' });
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo enviar el enlace de recuperación') });
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--bg-app)] p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md space-y-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
        <p className="text-sm text-[var(--text-secondary)]">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
        <div>
          <Input placeholder="Email" {...form.register('email')} />
          {form.formState.errors.email ? <p className="mt-1 text-xs text-red-400">{form.formState.errors.email.message}</p> : null}
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Enviando...' : 'Enviar enlace'}</Button>
        <Link href="/login" className="block text-center text-xs text-[var(--text-secondary)] hover:text-[var(--primary)]">Volver al login</Link>
      </form>
    </div>
  );
}
