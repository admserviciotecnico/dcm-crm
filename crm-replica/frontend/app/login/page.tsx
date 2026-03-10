'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { AuthApi } from '@/lib/api/endpoints';
import { authStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const setToken = authStore((s) => s.setToken);
  const setUser = authStore((s) => s.setUser);
  const router = useRouter();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    const login = await AuthApi.login(data);
    setToken(login.access_token);
    const me = await AuthApi.me();
    setUser(me);
    router.replace('/dashboard');
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="hidden bg-slate-950 p-10 md:block">
        <p className="text-sm text-cyan-400">DCM SERVICE CRM</p>
        <h1 className="mt-6 text-4xl font-bold">Gestión industrial de field service con trazabilidad total.</h1>
      </section>
      <section className="grid place-items-center p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Iniciar sesión</h2>
          <div><Input {...register('email')} placeholder="Email corporativo" />{errors.email ? <p className="text-xs text-red-300">{errors.email.message}</p> : null}</div>
          <div className="relative"><Input type={show ? 'text' : 'password'} {...register('password')} placeholder="Contraseña" /> <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-2 p-1">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>{errors.password ? <p className="text-xs text-red-300">{errors.password.message}</p> : null}</div>
          <Button disabled={isSubmitting} className="w-full">{isSubmitting ? 'Ingresando...' : 'Entrar'}</Button>
        </form>
      </section>
    </div>
  );
}
