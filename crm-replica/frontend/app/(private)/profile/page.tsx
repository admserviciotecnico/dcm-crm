'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authStore } from '@/stores/auth-store';
import { CalendarIntegrationsApi, TechnicianLocationApi, UsersApi } from '@/lib/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { appStore } from '@/stores/app-store';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { Card } from '@/components/ui/card';
import { ExternalCalendarConnection } from '@/types/domain';

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
  const [calendarConnections, setCalendarConnections] = useState<ExternalCalendarConnection[]>([]);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

  useEffect(() => {
    if (user) {
      reset({ first_name: user.first_name, last_name: user.last_name, phone: user.phone ?? '' });
    }
  }, [reset, user]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'calendar_connected') {
        void loadCalendarConnections();
        pushToast({ type: 'success', message: 'Calendario conectado correctamente' });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [pushToast]);

  const loadCalendarConnections = async () => {
    try {
      const data = await CalendarIntegrationsApi.list();
      setCalendarConnections(data);
    } catch {
      setCalendarConnections([]);
    }
  };

  const loadLocationSharing = async () => {
    try {
      const data = await TechnicianLocationApi.getSharing();
      setSharingEnabled(data.enabled);
    } catch {
      setSharingEnabled(false);
    }
  };

  useEffect(() => {
    void loadCalendarConnections();
    if (user?.role === 'tecnico') {
      void loadLocationSharing();
    }
  }, [user?.role]);

  const onSubmit = async (values: FormData) => {
    await UsersApi.updateMe(values);
    const me = await UsersApi.me();
    setUser(me);
    pushToast({ type: 'success', message: 'Perfil actualizado' });
  };

  const connectGoogleCalendar = async () => {
    try {
      const response = await CalendarIntegrationsApi.connect({ provider: 'google' });
      window.open(response.authorization_url, '_blank', 'width=560,height=760');
    } catch {
      pushToast({ type: 'error', message: 'No se pudo iniciar la conexión con Google Calendar' });
    }
  };

  const disconnectConnection = async (connectionId: string) => {
    await CalendarIntegrationsApi.disconnect(connectionId);
    await loadCalendarConnections();
    pushToast({ type: 'success', message: 'Conexión eliminada' });
  };

  const toggleLocationSharing = async () => {
    setSharingLoading(true);
    try {
      const response = await TechnicianLocationApi.setSharing(!sharingEnabled);
      setSharingEnabled(response.enabled);
      pushToast({
        type: 'success',
        message: response.enabled ? 'Compartir ubicación activado' : 'Compartir ubicación desactivado'
      });
    } catch {
      pushToast({ type: 'error', message: 'No se pudo actualizar el estado de ubicación' });
    } finally {
      setSharingLoading(false);
    }
  };

  return (
    <ErrorBoundary>
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mi Perfil</h1>
      <p className="text-[var(--text-secondary)]">{user?.email}</p>
      <form className="max-w-md space-y-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1"><label className="text-xs text-[var(--text-secondary)]">Nombre</label><Input placeholder="Nombre" {...register('first_name')} /></div>
        <div className="space-y-1"><label className="text-xs text-[var(--text-secondary)]">Apellido</label><Input placeholder="Apellido" {...register('last_name')} /></div>
        <div className="space-y-1"><label className="text-xs text-[var(--text-secondary)]">Teléfono</label><Input placeholder="Teléfono" {...register('phone')} /></div>
        <Button disabled={isSubmitting} type="submit">Guardar cambios</Button>
      </form>
      <Card>
        <h2 className="text-lg font-medium">Integración de calendario externo</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Sincroniza órdenes programadas con tu calendario. Soporte actual: Google Calendar.</p>
        <div className="mt-3 space-y-2">
          {calendarConnections.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No hay conexiones activas.</p> : calendarConnections.map((connection) => (
            <div key={connection.id} className="flex items-center justify-between rounded-[8px] border border-[var(--border)] px-3 py-2">
              <div>
                <p className="text-sm font-medium">{connection.provider.toUpperCase()}</p>
                <p className="text-xs text-[var(--text-secondary)]">Vence: {connection.expires_at ? new Date(connection.expires_at).toLocaleString() : 'sin vencimiento'}</p>
              </div>
              <Button variant="secondary" onClick={() => void disconnectConnection(connection.id)}>Desconectar</Button>
            </div>
          ))}
        </div>
        <Button className="mt-3" onClick={() => void connectGoogleCalendar()}>Conectar Google Calendar</Button>
      </Card>
      {user?.role === 'tecnico' ? (
        <Card>
          <h2 className="text-lg font-medium">Compartir ubicación (opt-in)</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Solo se enviará tu ubicación cuando actives esta opción explícitamente.</p>
          <div className="mt-3 flex items-center justify-between rounded-[8px] border border-[var(--border)] px-3 py-2">
            <p className="text-sm font-medium">{sharingEnabled ? 'Activo' : 'Inactivo'}</p>
            <Button variant="secondary" disabled={sharingLoading} onClick={() => void toggleLocationSharing()}>
              {sharingLoading ? 'Actualizando…' : sharingEnabled ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
    </ErrorBoundary>
  );
}
