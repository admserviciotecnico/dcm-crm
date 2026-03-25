import { OrderLocationEvent } from '@/types/domain';

export type OrderMapMarker = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
};

export function mapLocationEventsToMarkers(events: OrderLocationEvent[]): OrderMapMarker[] {
  return events.map((event) => ({
    id: event.id,
    label: event.event_type === 'arrival' ? 'Llegada' : 'Salida',
    latitude: event.latitude,
    longitude: event.longitude,
    recordedAt: event.created_at
  }));
}
