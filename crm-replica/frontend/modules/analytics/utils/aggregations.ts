import { addDays, format, startOfDay, subDays } from 'date-fns';
import { ServiceOrder } from '@/types/domain';
import { AnalyticsFilters } from '@/modules/analytics/types';

export function applyAnalyticsFilters(orders: ServiceOrder[], filters: AnalyticsFilters): ServiceOrder[] {
  return orders.filter((o) => {
    const date = o.fecha_programada ? new Date(o.fecha_programada) : null;
    const fromOk = filters.from ? (date ? date >= startOfDay(new Date(filters.from)) : false) : true;
    const toOk = filters.to ? (date ? date <= addDays(startOfDay(new Date(filters.to)), 1) : false) : true;
    const techOk = filters.technicianId ? (o.technicians ?? []).some((t) => t.technician_id === filters.technicianId) : true;
    const clientOk = filters.clientId ? o.client_id === filters.clientId : true;
    return fromOk && toOk && techOk && clientOk;
  });
}

export function groupOrdersByStatus(orders: ServiceOrder[]) {
  return Object.entries(orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.estado] = (acc[o.estado] ?? 0) + 1;
    return acc;
  }, {})).map(([label, value]) => ({ label, value }));
}

export function groupOrdersByTechnician(orders: ServiceOrder[]) {
  const counts: Record<string, number> = {};
  orders.forEach((o) => (o.technicians ?? []).forEach((t) => { counts[t.technician_id] = (counts[t.technician_id] ?? 0) + 1; }));
  return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function ordersOverTime(orders: ServiceOrder[]) {
  const range = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), 13 - i), 'yyyy-MM-dd'));
  return range.map((day) => ({
    label: day.slice(5),
    value: orders.filter((o) => o.fecha_programada && format(new Date(o.fecha_programada), 'yyyy-MM-dd') === day).length
  }));
}
