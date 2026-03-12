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
import { Select } from '@/components/ui/select';
import { appStore } from '@/stores/app-store';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Requerido')
});
const registerSchema = z.object({
  first_name: z.string().min(1, 'Requerido'),
  last_name: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm_password: z.string().min(1, 'Requerido'),
  role: z.enum(['admin', 'tecnico'])
}).refine((v) => v.password === v.confirm_password, { message: 'Las contraseñas no coinciden', path: ['confirm_password'] });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const setToken = authStore((s) => s.setToken);
  const setUser = authStore((s) => s.setUser);
  const pushToast = appStore((s) => s.pushToast);
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema), defaultValues: { role: 'tecnico' } });

  const onLogin = async (data: LoginFormData) => {
    const login = await AuthApi.login(data);
    setToken(login.access_token);
    const me = await AuthApi.me();
    setUser(me);
    router.replace('/dashboard');
  };

  const onRegister = async (data: RegisterFormData) => {
    await AuthApi.register({ first_name: data.first_name, last_name: data.last_name, email: data.email, password: data.password, role: data.role });
    pushToast({ type: 'success', message: 'Usuario registrado correctamente' });
    registerForm.reset({ first_name: '', last_name: '', email: '', password: '', confirm_password: '', role: 'tecnico' });
    setRegisterMode(false);
  };

  return (
    <div className="grid min-h-screen bg-[var(--bg-app)] md:grid-cols-2">
      <section className="hidden bg-[#1A2332] p-10 text-slate-100 md:block">
        <p className="text-sm text-cyan-400">DCM SERVICE CRM</p>
        <h1 className="mt-6 text-4xl font-bold">Gestión industrial de field service con trazabilidad total.</h1>
      </section>
      <section className="grid place-items-center bg-[var(--bg-surface)] p-6">
        {!registerMode ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="w-full max-w-sm space-y-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Iniciar sesión</h2>
            <div><Input {...loginForm.register('email')} placeholder="Email corporativo" />{loginForm.formState.errors.email ? <p className="mt-1 text-xs text-red-300">{loginForm.formState.errors.email.message}</p> : null}</div>
            <div className="relative"><Input type={show ? 'text' : 'password'} {...loginForm.register('password')} placeholder="Contraseña" /> <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-2 p-1">{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>{loginForm.formState.errors.password ? <p className="mt-1 text-xs text-red-300">{loginForm.formState.errors.password.message}</p> : null}</div>
            <Button type="submit" disabled={loginForm.formState.isSubmitting} className="w-full">{loginForm.formState.isSubmitting ? 'Ingresando...' : 'Entrar'}</Button>
            <button type="button" onClick={() => setRegisterMode(true)} className="text-xs text-[var(--primary)]">¿No tenés cuenta? Registrarte</button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="w-full max-w-sm space-y-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Registrarte</h2>
            <div><Input placeholder="Nombre" {...registerForm.register('first_name')} />{registerForm.formState.errors.first_name ? <p className="mt-1 text-xs text-red-300">{registerForm.formState.errors.first_name.message}</p> : null}</div>
            <div><Input placeholder="Apellido" {...registerForm.register('last_name')} />{registerForm.formState.errors.last_name ? <p className="mt-1 text-xs text-red-300">{registerForm.formState.errors.last_name.message}</p> : null}</div>
            <div><Input placeholder="Email" {...registerForm.register('email')} />{registerForm.formState.errors.email ? <p className="mt-1 text-xs text-red-300">{registerForm.formState.errors.email.message}</p> : null}</div>
            <div><Input type="password" placeholder="Contraseña" {...registerForm.register('password')} />{registerForm.formState.errors.password ? <p className="mt-1 text-xs text-red-300">{registerForm.formState.errors.password.message}</p> : null}</div>
            <div><Input type="password" placeholder="Confirmar contraseña" {...registerForm.register('confirm_password')} />{registerForm.formState.errors.confirm_password ? <p className="mt-1 text-xs text-red-300">{registerForm.formState.errors.confirm_password.message}</p> : null}</div>
            <div><Select {...registerForm.register('role')}><option value="tecnico">Técnico</option><option value="admin">Admin</option></Select>{registerForm.formState.errors.role ? <p className="mt-1 text-xs text-red-300">{registerForm.formState.errors.role.message}</p> : null}</div>
            <Button type="submit" disabled={registerForm.formState.isSubmitting} className="w-full">{registerForm.formState.isSubmitting ? 'Registrando...' : 'Crear cuenta'}</Button>
            <button type="button" onClick={() => setRegisterMode(false)} className="text-xs text-[var(--primary)]">Volver al login</button>
          </form>
        )}
      </section>
    </div>
  );
}
