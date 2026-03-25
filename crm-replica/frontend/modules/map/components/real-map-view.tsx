'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { MapOrderMarker, TechnicianMapLocation } from '@/types/domain';

type Props = {
  orders: MapOrderMarker[];
  technicians: TechnicianMapLocation[];
};

type FeatureProperties = {
  type: 'order' | 'technician';
  id: string;
  label: string;
  subtitle?: string;
  delayed?: boolean;
  url?: string;
};

type PointGeometry = { type: 'Point'; coordinates: [number, number] };
type GeoFeature = { type: 'Feature'; geometry: PointGeometry; properties: FeatureProperties };
type GeoCollection = { type: 'FeatureCollection'; features: GeoFeature[] };

declare global {
  interface Window {
    mapboxgl?: any;
  }
}

function toGeoJson(orders: MapOrderMarker[], technicians: TechnicianMapLocation[]): GeoCollection {
  return {
    type: 'FeatureCollection',
    features: [
      ...orders.map((order) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [order.lng, order.lat] as [number, number] },
        properties: {
          type: 'order' as const,
          id: order.id,
          delayed: order.delayed,
          label: `#${order.id.slice(0, 8)} · ${order.client_name ?? order.client_id}`,
          subtitle: `${order.estado} · ${order.prioridad}`,
          url: `/orders/${order.id}`
        }
      })),
      ...technicians.map((technician) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [technician.lng, technician.lat] as [number, number] },
        properties: {
          type: 'technician' as const,
          id: technician.user_id,
          label: `${technician.first_name} ${technician.last_name}`.trim() || technician.email,
          subtitle: technician.email
        }
      }))
    ]
  };
}

async function ensureMapboxGlLoaded() {
  if (typeof window === 'undefined') return null;
  if (window.mapboxgl) return window.mapboxgl;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Mapbox GL JS'));
    document.head.appendChild(script);
  });

  return window.mapboxgl ?? null;
}

export function RealMapView({ orders, technicians }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  const geoJson = useMemo(() => toGeoJson(orders, technicians), [orders, technicians]);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      if (!token || !mapContainerRef.current || mapRef.current) return;

      try {
        const mapboxgl = await ensureMapboxGlLoaded();
        if (!mounted || !mapboxgl) return;

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-58.3816, -34.6037],
          zoom: 4
        });

        mapRef.current = map;

        map.on('load', () => {
          map.addSource('crm-points', {
            type: 'geojson',
            data: geoJson,
            cluster: true,
            clusterMaxZoom: 12,
            clusterRadius: 45
          });

          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'crm-points',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#2563EB',
              'circle-radius': ['step', ['get', 'point_count'], 15, 15, 19, 40, 23],
              'circle-opacity': 0.85
            }
          });

          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'crm-points',
            filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
            paint: { 'text-color': '#FFFFFF' }
          });

          map.addLayer({
            id: 'order-points',
            type: 'circle',
            source: 'crm-points',
            filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'order']],
            paint: {
              'circle-color': ['case', ['==', ['get', 'delayed'], true], '#DC2626', '#0284C7'],
              'circle-radius': 8,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#0F172A'
            }
          });

          map.addLayer({
            id: 'technician-points',
            type: 'circle',
            source: 'crm-points',
            filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'technician']],
            paint: {
              'circle-color': '#059669',
              'circle-radius': 8,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#0F172A'
            }
          });

          map.on('click', 'clusters', (event: any) => {
            const cluster = map.queryRenderedFeatures(event.point, { layers: ['clusters'] })[0];
            if (!cluster) return;
            const clusterId = cluster.properties?.cluster_id;
            const source = map.getSource('crm-points');
            if (!source || typeof clusterId !== 'number') return;

            source.getClusterExpansionZoom(clusterId, (error: Error | null, zoom: number) => {
              if (error) return;
              const point = cluster.geometry.type === 'Point' ? cluster.geometry.coordinates : null;
              if (!point) return;
              map.easeTo({ center: [point[0], point[1]], zoom });
            });
          });

          map.on('click', ['order-points', 'technician-points'], (event: any) => {
            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== 'Point') return;
            const props = feature.properties as FeatureProperties;
            const coordinates = [...feature.geometry.coordinates] as [number, number];
            const details = props.url
              ? `<a href="${props.url}" style="color:#2563eb;text-decoration:underline">Abrir orden</a>`
              : '<span>Técnico en ubicación activa</span>';
            new mapboxgl.Popup({ closeButton: true })
              .setLngLat(coordinates)
              .setHTML(`<div><strong>${props.label}</strong><br/>${props.subtitle ?? ''}<br/>${details}</div>`)
              .addTo(map);
          });

          setMapReady(true);
        });

        map.on('error', () => setLoadError('No se pudo renderizar el mapa con Mapbox'));
      } catch {
        if (mounted) setLoadError('No se pudo cargar Mapbox GL JS');
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [geoJson, token]);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = window.mapboxgl;
    if (!map || !mapboxgl || !mapReady) return;

    const source = map.getSource('crm-points');
    if (source) {
      source.setData(geoJson);
    }

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    geoJson.features.forEach((feature: GeoFeature) => {
      bounds.extend(feature.geometry.coordinates as [number, number]);
      hasPoints = true;
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: 60, duration: 600, maxZoom: 13 });
    }
  }, [geoJson, mapReady]);

  if (!token) return null;
  if (loadError) {
    return (
      <Card>
        <p className="text-sm font-medium">Mapa no disponible</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{loadError}. Se mantiene la vista operativa de respaldo.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={mapContainerRef} className="h-[560px] w-full rounded-[12px] border border-[var(--border)]" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-medium">Órdenes con coordenadas</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Mostrando {orders.length} orden(es) con coordenadas reales.</p>
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
        </Card>
      </div>
    </div>
  );
}
