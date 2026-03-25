'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { PortalAuthApi } from '@/lib/api/endpoints';
import { portalAuthStore } from '@/stores/portal-auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';

type FormData = {
  email: string;
  password: string;
};

export default function PortalLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const setToken = portalAuthStore((state) => state.setToken);
  const setUser = portalAuthStore((state) => state.setUser);
  const toast = appStore((state) => state.pushToast);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const login = await PortalAuthApi.login(values);
      setToken(login.access_token);
      setUser(login.user);
      router.replace('/portal');
    } catch (error) {
      toast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo iniciar sesión en el portal') });
    } finally {
      setLoading(false);
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] p-6">
      <Card className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Portal cliente</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Acceso a clientes</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Consultá órdenes, historial y documentos de tu empresa en modo solo lectura.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <Input {...register('email', { required: 'Ingresá tu email' })} placeholder="Email" />
            {errors.email ? <p className="mt-1 text-xs text-red-400">{errors.email.message}</p> : null}
          </div>
          <div>
            <Input type="password" {...register('password', { required: 'Ingresá tu contraseña' })} placeholder="Contraseña" />
            {errors.password ? <p className="mt-1 text-xs text-red-400">{errors.password.message}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Ingresando…' : 'Entrar al portal'}</Button>
        </form>
      </Card>
    </main>
  );
}
