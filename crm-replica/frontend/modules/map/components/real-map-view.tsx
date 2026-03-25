'use client';

import Link from 'next/link';
import { MapOrderMarker, TechnicianMapLocation } from '@/types/domain';
import { Card } from '@/components/ui/card';

type Props = {
  orders: MapOrderMarker[];
  technicians: TechnicianMapLocation[];
};

function buildStaticMapUrl({ token, orders, technicians }: { token: string; orders: MapOrderMarker[]; technicians: TechnicianMapLocation[] }) {
  const points = [
    ...orders.slice(0, 80).map((order) => `pin-s-${order.delayed ? 'f43f5e' : '0ea5e9'}(${order.lng},${order.lat})`),
    ...technicians.slice(0, 80).map((tech) => `pin-s-22c55e(${tech.lng},${tech.lat})`)
  ];
  const overlay = points.length ? points.join(',') : 'pin-s-64748b(-58.3816,-34.6037)';
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlay}/auto/1200x520?padding=40&access_token=${encodeURIComponent(token)}`;
}

export function RealMapView({ orders, technicians }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  const imageUrl = buildStaticMapUrl({ token, orders, technicians });

  return (
    <div className="space-y-3">
      <img
        src={imageUrl}
        alt="Mapa operativo con órdenes y técnicos"
        className="h-[520px] w-full rounded-[12px] border border-[var(--border)] object-cover"
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-medium">Órdenes con coordenadas</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Mostrando {orders.length} orden(es) con check-in geolocalizado.</p>
          <div className="mt-2 space-y-1 text-xs">
            {orders.slice(0, 8).map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="block text-[var(--primary)] hover:underline">
                #{order.id.slice(0, 8)} · {order.client_name ?? order.client_id} · {order.delayed ? 'demorada' : 'activa'}
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium">Técnicos con ubicación compartida</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{technicians.length} técnico(s) activos con opt-in.</p>
          <div className="mt-2 space-y-1 text-xs">
            {technicians.slice(0, 8).map((tech) => (
              <p key={tech.user_id}>
                {tech.first_name} {tech.last_name} · {new Date(tech.captured_at).toLocaleString()}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
