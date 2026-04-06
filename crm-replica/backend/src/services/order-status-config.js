import { prisma } from '../config/prisma.js';

export const SYSTEM_ORDER_STATUSES = [
  { key: 'presupuesto_generado', label: 'Presupuesto generado', color: '#64748b', sort_order: 10 },
  { key: 'oc_recibida', label: 'OC recibida', color: '#0ea5e9', sort_order: 20 },
  { key: 'facturado', label: 'Facturado', color: '#2563eb', sort_order: 30 },
  { key: 'pago_recibido', label: 'Pago recibido', color: '#06b6d4', sort_order: 40 },
  { key: 'documentacion_enviada', label: 'Documentación enviada', color: '#8b5cf6', sort_order: 50 },
  { key: 'documentacion_aprobada', label: 'Documentación aprobada', color: '#7c3aed', sort_order: 60 },
  { key: 'service_programado', label: 'Service programado', color: '#f59e0b', sort_order: 70 },
  { key: 'en_ejecucion', label: 'En ejecución', color: '#f97316', sort_order: 80 },
  { key: 'completado', label: 'Completado', color: '#10b981', sort_order: 90 },
  { key: 'cancelado', label: 'Cancelado', color: '#ef4444', sort_order: 100 }
];

export const SYSTEM_STATUS_KEYS = new Set(SYSTEM_ORDER_STATUSES.map((status) => status.key));

export function isWorkflowStatusKey(key) {
  return SYSTEM_STATUS_KEYS.has(String(key));
}

export async function ensureSystemOrderStatuses() {
  await Promise.all(SYSTEM_ORDER_STATUSES.map((status) => prisma.orderStatusConfig.upsert({
    where: { key: status.key },
    create: {
      key: status.key,
      label: status.label,
      color: status.color,
      sort_order: status.sort_order,
      is_active: true,
      is_system: true
    },
    update: {
      is_system: true,
      sort_order: status.sort_order
    }
  })));
}

export async function listOrderStatuses({ includeInactive = true } = {}) {
  await ensureSystemOrderStatuses();
  return prisma.orderStatusConfig.findMany({
    where: includeInactive ? undefined : { is_active: true },
    orderBy: [{ sort_order: 'asc' }, { label: 'asc' }]
  });
}

export async function statusKeyExists(key) {
  if (!key) return false;
  const found = await prisma.orderStatusConfig.findUnique({ where: { key } });
  return !!found;
}
