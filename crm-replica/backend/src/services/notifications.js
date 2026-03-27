import { prisma } from '../config/prisma.js';

const DOC_WINDOW_DAYS = 30;
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const ORDER_STATUS_LABEL = {
  presupuesto_generado: 'Presupuesto generado',
  oc_recibida: 'OC recibida',
  facturado: 'Facturado',
  pago_recibido: 'Pago recibido',
  documentacion_enviada: 'Documentación enviada',
  documentacion_aprobada: 'Documentación aprobada',
  service_programado: 'Service programado',
  en_ejecucion: 'En ejecución',
  completado: 'Completado',
  cancelado: 'Cancelado'
};

export function shortId(value) {
  return String(value).slice(0, 8);
}

function notificationKey(item) {
  if (item.kind === 'doc_expiry' && item.client_id) {
    return `${item.user_id}|doc_expiry|${item.client_id}`;
  }
  if (item.service_order_id) {
    return `${item.user_id}|${item.kind ?? 'order'}|${item.service_order_id}`;
  }
  return `${item.user_id}|${item.kind ?? 'generic'}|${item.title}`;
}

function recentNotificationWhere(item) {
  if (item.kind === 'doc_expiry' && item.client_id) {
    return { user_id: item.user_id, kind: 'doc_expiry', client_id: item.client_id };
  }
  if (item.service_order_id) {
    return { user_id: item.user_id, kind: item.kind ?? 'order', service_order_id: item.service_order_id };
  }
  return { user_id: item.user_id, kind: item.kind ?? 'generic', title: item.title };
}

export async function createNotifications(db, notifications) {
  const valid = notifications.filter((item) => item.user_id && item.title && item.description);
  if (!valid.length) return;

  const windowStart = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const existing = await db.notification.findMany({
    where: {
      created_at: { gte: windowStart },
      OR: valid.map(recentNotificationWhere)
    },
    select: { user_id: true, kind: true, client_id: true, service_order_id: true, title: true }
  });

  const existingKeys = new Set(existing.map(notificationKey));
  const pending = valid.filter((item) => !existingKeys.has(notificationKey(item)));
  if (!pending.length) return;

  const uniquePending = [];
  const seen = new Set(existingKeys);
  for (const item of pending) {
    const key = notificationKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    uniquePending.push(item);
  }

  if (!uniquePending.length) return;
  await db.notification.createMany({ data: uniquePending });
}

export async function notifyAssignedTechnicians(db, { orderId, technicianIds, title, description, kind = 'order' }) {
  const uniqueTechnicians = [...new Set(technicianIds.filter(Boolean))];
  if (!uniqueTechnicians.length) return;

  const validTechnicians = await db.user.findMany({
    where: {
      id: { in: uniqueTechnicians },
      active: true,
      role: { name: 'tecnico' }
    },
    select: { id: true }
  });
  if (!validTechnicians.length) return;

  await createNotifications(
    db,
    validTechnicians.map((technician) => ({
      user_id: technician.id,
      service_order_id: orderId,
      kind,
      title,
      description
    }))
  );
}

export async function ensureClientDocumentationNotifications(db = prisma) {
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + DOC_WINDOW_DAYS);

  const [admins, clients] = await Promise.all([
    db.user.findMany({ where: { active: true, role: { name: 'admin' } }, select: { id: true } }),
    db.client.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        fecha_vencimiento_documentacion: { lte: windowEnd }
      },
      select: { id: true, nombre_empresa: true, fecha_vencimiento_documentacion: true }
    })
  ]);

  if (!admins.length || !clients.length) return;

  const candidates = [];
  for (const client of clients) {
    if (!client.fecha_vencimiento_documentacion) continue;
    const expired = client.fecha_vencimiento_documentacion < now;
    const title = expired ? 'Documentación vencida' : 'Documentación por vencer';
    const dateText = client.fecha_vencimiento_documentacion.toISOString().slice(0, 10);
    const description = expired
      ? `La documentación de ${client.nombre_empresa} venció el ${dateText}`
      : `La documentación de ${client.nombre_empresa} vence el ${dateText}`;

    admins.forEach((admin) => {
      candidates.push({ user_id: admin.id, kind: 'doc_expiry', client_id: client.id, title, description });
    });
  }

  if (!candidates.length) return;
  await createNotifications(db, candidates);
}
