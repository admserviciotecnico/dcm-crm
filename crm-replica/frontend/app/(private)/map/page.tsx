'use client';

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { TableSkeleton } from '@/components/common/skeletons';
import { useMapData } from '@/modules/map/hooks/use-map-data';
import { MapView } from '@/modules/map/components/map-view';
import { RealMapView } from '@/modules/map/components/real-map-view';
import { authStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { TechnicianLocationApi } from '@/lib/api/endpoints';
import { appStore } from '@/stores/app-store';
import { getApiErrorMessage } from '@/lib/api/error-message';

export default function MapPage() {
  const user = authStore((state) => state.user);
  const { orders, users, mapOrders, mapTechnicians, mode, loading } = useMapData(user?.role ?? 'tecnico');
  const pushToast = appStore((state) => state.pushToast);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  const updateCurrentLocation = async () => {
    if (!navigator.geolocation) {
      pushToast({ type: 'error', message: 'Geolocalización no soportada por este navegador' });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        await TechnicianLocationApi.updateLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      } catch (error) {
        pushToast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo enviar la ubicación') });
      }
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED ? 'Permiso de ubicación denegado' : 'No se pudo obtener la ubicación';
      pushToast({ type: 'error', message });
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 });
  };

  useEffect(() => {
    if (user?.role !== 'tecnico') return;
    TechnicianLocationApi.getSharing()
      .then((data) => setSharingEnabled(data.enabled))
      .catch(() => setSharingEnabled(false));
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'tecnico' || !sharingEnabled || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(async (position) => {
      await TechnicianLocationApi.updateLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    }, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [sharingEnabled, user?.role]);

  const toggleSharing = async () => {
    setShareLoading(true);
    try {
      const response = await TechnicianLocationApi.setSharing(!sharingEnabled);
      setSharingEnabled(response.enabled);
      pushToast({ type: 'success', message: response.enabled ? 'Compartir ubicación activado' : 'Compartir ubicación desactivado' });
      if (response.enabled) await updateCurrentLocation();
    } catch (error) {
      pushToast({ type: 'error', message: getApiErrorMessage(error, 'No se pudo actualizar el estado de ubicación') });
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Mapa" description="Vista operativa de técnicos y órdenes activas por ubicación." />
      {user?.role === 'tecnico' ? (
        <Card>
          <h3 className="text-lg font-medium">Ubicación en tiempo real (opt-in)</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Tu ubicación solo se comparte si la activás explícitamente.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" disabled={shareLoading} onClick={() => void toggleSharing()}>
              {shareLoading ? 'Actualizando…' : sharingEnabled ? 'Detener compartir ubicación' : 'Activar compartir ubicación'}
            </Button>
            <Button variant="secondary" onClick={() => void updateCurrentLocation()} disabled={!sharingEnabled}>Actualizar ubicación ahora</Button>
          </div>
        </Card>
      ) : null}
      {loading ? <TableSkeleton rows={8} cols={4} /> : (
        mode === 'admin' && token
          ? <RealMapView orders={mapOrders} technicians={mapTechnicians} />
          : <MapView orders={orders} users={users} />
      )}
      <Card>
        <p className="text-sm text-[var(--text-secondary)]">
          {mode === 'admin' && token
            ? 'Mapa en tiempo real con Mapbox y marcadores de órdenes/tecnicos activos.'
            : 'Fallback operativo activo: no se detectó token MAPBOX o no estás en rol de despacho/admin.'}
        </p>
      </Card>
    </div>
  );
}
