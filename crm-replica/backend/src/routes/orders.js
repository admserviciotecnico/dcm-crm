import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { computePriorityWeight, validateStateTransition, validateTechnicianRestrictedFields } from '../services/order-rules.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { invoiceDraftCreateSchema, locationEventCreateSchema, materialCreateSchema, materialUpdateSchema, orderCreateSchema, orderPatchSchema, techniciansUpdateSchema } from '../services/schemas.js';
import { logEvent } from '../services/event-log.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { createNotifications, notifyAssignedTechnicians, ORDER_STATUS_LABEL, shortId } from '../services/notifications.js';
import { computeSlaDeadline, getSlaStatus } from '../utils/sla.js';
import { createSimplePdf } from '../utils/pdf.js';
import { buildInvoiceDraftFromOrder } from '../services/invoice-draft.js';
import { syncOrderCalendarEvents } from '../services/calendar-integrations.js';
import { isWorkflowStatusKey, statusKeyExists } from '../services/order-status-config.js';

const MAX_PAGE_SIZE = 100;
const SORT_FIELDS = {
  fecha_programada: 'fecha_programada',
  estado: 'estado',
  prioridad: 'prioridad_peso',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

const ORDER_INCLUDE = {
  technicians: { include: { technician: true } },
  client: true,
  ticket: true,
  materials: true,
  invoice_draft: true,
  external_calendar_events: true
};

const ORDER_DETAIL_INCLUDE = {
  ...ORDER_INCLUDE,
  location_events: {
    include: {
      user: {
        include: { role: true }
      }
    },
    orderBy: { created_at: 'desc' }
  }
};

const OPERATIONAL_READ_ONLY_STATES = new Set(['cancelado', 'completado']);
const READ_ONLY_MESSAGE = 'La orden está en estado final y no puede modificarse';

function isOperationalReadOnly(order) {
  return Boolean(order && OPERATIONAL_READ_ONLY_STATES.has(order.estado));
}

function enrichOrderWithSla(order) {
  const slaDeadline = computeSlaDeadline(order.created_at, order.prioridad);
  return {
    ...order,
    sla_deadline: slaDeadline?.toISOString() ?? null,
    sla_status: getSlaStatus(slaDeadline, order.estado)
  };
}

function toHistoryEntries({ before, after, userId, comment }) {
  const entries = [];

  if (before.estado !== after.estado) {
    entries.push({
      service_order_id: before.id,
      estado_anterior: before.estado,
      estado_nuevo: after.estado,
      campo_modificado: 'estado',
      valor_anterior: before.estado,
      valor_nuevo: after.estado,
      comentario: comment || 'Cambio de estado',
      usuario_id: userId
    });
  }

  for (const field of ['prioridad', 'fecha_programada', 'observaciones_cierre', 'tiempo_trabajado_horas', 'firma_cliente', 'foto_trabajo_url', 'checklist_cierre']) {
    const prev = before[field] instanceof Date ? before[field].toISOString() : typeof before[field] === 'object' && before[field] !== null ? JSON.stringify(before[field]) : before[field];
    const next = after[field] instanceof Date ? after[field].toISOString() : typeof after[field] === 'object' && after[field] !== null ? JSON.stringify(after[field]) : after[field];
    if (prev !== next) {
      entries.push({
        service_order_id: before.id,
        estado_anterior: before.estado,
        estado_nuevo: after.estado,
        campo_modificado: field,
        valor_anterior: prev ? String(prev) : null,
        valor_nuevo: next ? String(next) : null,
        comentario: `Cambio de ${field}`,
        usuario_id: userId
      });
    }
  }

  return entries;
}

function ensureOrderAccess(order, user) {
  if (!order || order.deleted_at || !order.is_active) return { ok: false, status: 404, message: 'Not found' };
  if (user.role.name === 'tecnico') {
    const assigned = order.technicians.some((technician) => technician.technician_id === user.id);
    if (!assigned) return { ok: false, status: 403, message: 'Forbidden' };
  }
  return { ok: true };
}

async function getAccessibleOrder(orderId, user) {
  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId }, include: ORDER_DETAIL_INCLUDE });
  const access = ensureOrderAccess(order, user);
  return { order, access };
}

function formatChecklist(checklist) {
  if (!checklist || typeof checklist !== 'object') return 'Sin checklist';
  return Object.entries(checklist).map(([key, value]) => `${key}: ${value ? 'sí' : 'no'}`).join(' | ');
}

async function safeSyncOrderCalendars({ orderId, actorUserId, technicianIds }) {
  try {
    await syncOrderCalendarEvents({ orderId, actorUserId, technicianIds });
  } catch {
    // intentionally swallow sync errors to avoid breaking primary order workflows.
  }
}

async function validateLocationEventWrite(orderId, userId, eventType) {
  const latest = await prisma.orderLocationEvent.findFirst({
    where: { order_id: orderId, user_id: userId, event_type: eventType },
    orderBy: { created_at: 'desc' }
  });

  if (!latest) return { ok: true };
  const elapsedMs = Date.now() - new Date(latest.created_at).getTime();
  if (elapsedMs < 5 * 60 * 1000) {
    return { ok: false, status: 409, message: 'Ya registraste este evento recientemente' };
  }
  return { ok: true };
}

export default function ordersRouter(io) {
  const router = Router();
  router.use(authRequired);

  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
    const { status, technician, client, priority, from, to, delayed } = req.query;
    const q = String(req.query.q || '').trim();
    const sortBy = SORT_FIELDS[String(req.query.sortBy || 'updated_at')] ?? 'updated_at';
    const sortDir = String(req.query.sortDir || 'desc') === 'asc' ? 'asc' : 'desc';

    const where = { is_active: true, deleted_at: null };
    if (status) where.estado = status;
    if (client) where.client_id = client;
    if (priority) where.prioridad = priority;
    if (q) {
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { client: { is: { nombre_empresa: { contains: q, mode: 'insensitive' } } } },
        { direccion_service: { contains: q, mode: 'insensitive' } },
        { observaciones: { contains: q, mode: 'insensitive' } }
      ];
    }
    if (from || to) {
      where.fecha_programada = { gte: from ? new Date(String(from)) : undefined, lte: to ? new Date(String(to)) : undefined };
    }
    if (String(delayed) === 'true') {
      where.fecha_programada = {
        ...(where.fecha_programada ?? {}),
        lt: new Date()
      };
      where.estado = {
        notIn: ['completado', 'cancelado'],
        ...(status ? { equals: String(status) } : {})
      };
    }

    if (req.user.role.name === 'tecnico') {
      where.technicians = { some: { technician_id: req.user.id } };
    } else if (technician) {
      where.technicians = { some: { technician_id: String(technician) } };
    }

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.serviceOrder.findMany({ where, include: ORDER_INCLUDE, orderBy: [{ [sortBy]: sortDir }, { updated_at: 'desc' }], skip, take: pageSize }),
      prisma.serviceOrder.count({ where })
    ]);
    res.json({ items: items.map(enrichOrderWithSla), total, page, pageSize });
  }));

  router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
    const { order, access } = await getAccessibleOrder(req.params.id, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);
    res.json(enrichOrderWithSla(order));
  }));

  router.get('/:id/pdf', validateIdParam, asyncHandler(async (req, res) => {
    const { order, access } = await getAccessibleOrder(req.params.id, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);

    const materialList = order.materials ?? [];
    const technicianNames = order.technicians.map((item) => `${item.technician.first_name} ${item.technician.last_name}`.trim()).join(', ') || 'Sin técnicos asignados';
    const materialsTotal = materialList.reduce((sum, material) => sum + (material.quantity * material.unit_cost), 0);
    const lines = [
      'DCM CRM - Orden de Servicio',
      `Orden: #${shortId(order.id)}`,
      `Cliente: ${order.client?.nombre_empresa ?? order.client_id}`,
      `Estado: ${ORDER_STATUS_LABEL[order.estado] ?? order.estado}`,
      `Prioridad: ${order.prioridad}`,
      `Técnicos: ${technicianNames}`,
      `Fecha programada: ${order.fecha_programada ? new Date(order.fecha_programada).toLocaleString() : 'Sin fecha'}`,
      `Observaciones: ${order.observaciones ?? '-'}`,
      `Cierre: ${order.observaciones_cierre ?? '-'}`,
      `Horas trabajadas: ${order.tiempo_trabajado_horas ?? '-'}`,
      `Checklist: ${formatChecklist(order.checklist_cierre)}`,
      `Firma cliente: ${order.firma_cliente ?? '-'}`,
      `Foto trabajo: ${order.foto_trabajo_url ?? '-'}`,
      `Materiales: ${materialList.length ? materialList.map((material) => `${String(material.name ?? '').replace(/\|/g, '-')} x${material.quantity} ($${material.unit_cost})`).join(' | ') : 'Sin materiales'}`,
      `Total materiales: $${materialsTotal.toFixed(2)}`
    ];

    const pdf = createSimplePdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="service-order-${shortId(order.id)}.pdf"`);
    res.send(pdf);
  }));

  router.post('/', requireRole('admin'), validateBody(orderCreateSchema), asyncHandler(async (req, res) => {
    const { technicians = [], ...data } = req.body;
    if (!(await statusKeyExists(data.estado))) return sendError(res, 400, 'Estado inválido');
    if (!isWorkflowStatusKey(data.estado)) return sendError(res, 400, 'Estado fuera de flujo operativo');
    if (data.ticket_id) {
      const ticket = await prisma.ticket.findUnique({ where: { id: data.ticket_id } });
      if (!ticket || ticket.deleted_at) return sendError(res, 400, 'Ticket inválido');
      if (ticket.status === 'closed') return sendError(res, 400, 'No se puede crear orden desde ticket cerrado');
    }
    data.prioridad_peso = computePriorityWeight(data.prioridad);

    const tx = await prisma.$transaction(async (db) => {
      const order = await db.serviceOrder.create({ data });
      await createNotifications(db, [{
        user_id: req.user.id,
        service_order_id: order.id,
        kind: 'order_created',
        title: 'Orden creada',
        description: `Se creó la orden #${shortId(order.id)}`
      }]);
      if (technicians.length) {
        await db.serviceOrderTechnician.createMany({
          data: technicians.map((technicianId) => ({ service_order_id: order.id, technician_id: technicianId, asignado_por: req.user.email }))
        });
        await notifyAssignedTechnicians(db, {
          orderId: order.id,
          technicianIds: technicians,
          title: 'Nueva orden asignada',
          description: `Se te asignó la orden #${shortId(order.id)}`,
          kind: 'order_created_assignment'
        });
      }

      await db.serviceOrderStatusHistory.create({
        data: {
          service_order_id: order.id,
          estado_anterior: null,
          estado_nuevo: order.estado,
          campo_modificado: 'estado',
          valor_anterior: null,
          valor_nuevo: order.estado,
          comentario: 'Creación de orden',
          usuario_id: req.user.id
        }
      });

      return order;
    });

    io.emit('orders:changed', { type: 'created', orderId: tx.id });
    io.emit('dashboard:refresh', { reason: 'order_created' });
    await logEvent({ entity_type: 'order', entity_id: tx.id, event_type: 'created', message: `Orden creada #${shortId(tx.id)}`, actor_user_id: req.user.id });
    await safeSyncOrderCalendars({ orderId: tx.id, actorUserId: req.user.id, technicianIds: technicians });
    res.status(201).json(tx);
  }));

  router.patch('/:id', validateIdParam, validateBody(orderPatchSchema), asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    if (!order || order.deleted_at || !order.is_active) return sendError(res, 404, 'Not found');
    if (isOperationalReadOnly(order)) return sendError(res, 409, READ_ONLY_MESSAGE);

    const role = req.user.role.name;
    const assigned = order.technicians.some((technician) => technician.technician_id === req.user.id);
    if (role === 'tecnico' && !assigned) return sendError(res, 403, 'Forbidden');

    if (role === 'tecnico') {
      const restricted = validateTechnicianRestrictedFields(req.body);
      if (!restricted.ok) return sendError(res, 400, restricted.reason);
    }

    const transition = validateStateTransition({ role, currentState: order.estado, nextState: req.body.estado });
    if (!transition.ok) return sendError(res, 400, transition.reason);
    if (req.body.estado && !(await statusKeyExists(req.body.estado))) return sendError(res, 400, 'Estado inválido');
    if (req.body.estado && !isWorkflowStatusKey(req.body.estado)) return sendError(res, 400, 'Estado fuera de flujo operativo');

    const patch = { ...req.body };
    if (patch.prioridad) patch.prioridad_peso = computePriorityWeight(patch.prioridad);
    if (patch.fecha_programada) patch.fecha_programada = new Date(patch.fecha_programada);

    const updated = await prisma.$transaction(async (db) => {
      const newOrder = await db.serviceOrder.update({ where: { id: order.id }, data: patch });
      const historyEntries = toHistoryEntries({ before: order, after: newOrder, userId: req.user.id, comment: req.body.comentario });
      if (historyEntries.length) await db.serviceOrderStatusHistory.createMany({ data: historyEntries });
      if (order.estado !== newOrder.estado) {
        await notifyAssignedTechnicians(db, {
          orderId: order.id,
          technicianIds: order.technicians.map((technician) => technician.technician_id),
          title: 'Orden actualizada',
          description: `La orden #${shortId(order.id)} cambió a ${ORDER_STATUS_LABEL[newOrder.estado] ?? newOrder.estado}`,
          kind: 'order_status_changed'
        });
      }
      return newOrder;
    });

    if (order.estado !== updated.estado) {
      io.emit('orders:status_changed', { orderId: order.id, from: order.estado, to: updated.estado, by: req.user.email });
      await logEvent({ entity_type: 'order', entity_id: order.id, event_type: 'status_changed', message: `Estado de orden cambiado: ${order.estado} → ${updated.estado}`, actor_user_id: req.user.id });
    }
    io.emit('orders:changed', { type: 'updated', orderId: order.id });
    io.emit('dashboard:refresh', { reason: 'order_updated' });

    if (order.estado === updated.estado) {
      await logEvent({ entity_type: 'order', entity_id: order.id, event_type: 'updated', message: `Orden actualizada #${shortId(order.id)}`, actor_user_id: req.user.id });
    }

    await safeSyncOrderCalendars({ orderId: order.id, actorUserId: req.user.id });

    const refreshed = await prisma.serviceOrder.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
    res.json(enrichOrderWithSla(refreshed));
  }));

  router.delete('/:id', requireRole('admin'), validateIdParam, asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
    if (!order || order.deleted_at || !order.is_active) return sendError(res, 404, 'Not found');

    await prisma.serviceOrder.update({ where: { id: req.params.id }, data: { is_active: false, deleted_at: new Date() } });
    io.emit('orders:changed', { type: 'deleted', orderId: req.params.id });
    io.emit('dashboard:refresh', { reason: 'order_deleted' });
    await logEvent({ entity_type: 'order', entity_id: req.params.id, event_type: 'deleted', message: `Orden eliminada #${shortId(req.params.id)}`, actor_user_id: req.user.id });
    await safeSyncOrderCalendars({ orderId: req.params.id, actorUserId: req.user.id });
    res.json({ ok: true });
  }));

  router.get('/:id/history', validateIdParam, asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    const access = ensureOrderAccess(order, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);

    const data = await prisma.serviceOrderStatusHistory.findMany({
      where: { service_order_id: req.params.id },
      include: { usuario: { include: { role: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(data.map((entry) => ({
      ...entry,
      actor_name: `${entry.usuario.first_name ?? ''} ${entry.usuario.last_name ?? ''}`.trim() || entry.usuario.email,
      actor_role: entry.usuario.role?.name ?? null,
      summary: `${entry.campo_modificado ?? 'estado'}: ${entry.valor_anterior ?? '-'} → ${entry.valor_nuevo ?? '-'}`
    })));
  }));

  router.get('/:id/materials', validateIdParam, asyncHandler(async (req, res) => {
    const { order, access } = await getAccessibleOrder(req.params.id, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);
    res.json(order.materials);
  }));

  router.get('/:id/location-events', validateIdParam, asyncHandler(async (req, res) => {
    const { order, access } = await getAccessibleOrder(req.params.id, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);

    const events = await prisma.orderLocationEvent.findMany({
      where: { order_id: req.params.id },
      include: {
        user: {
          include: { role: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(events);
  }));

  router.post('/:id/location-events', validateIdParam, validateBody(locationEventCreateSchema), asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    const access = ensureOrderAccess(order, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);
    if (isOperationalReadOnly(order)) return sendError(res, 409, READ_ONLY_MESSAGE);

    const locationWrite = await validateLocationEventWrite(req.params.id, req.user.id, req.body.event_type);
    if (!locationWrite.ok) return sendError(res, locationWrite.status, locationWrite.message);

    const event = await prisma.orderLocationEvent.create({
      data: {
        order_id: req.params.id,
        user_id: req.user.id,
        event_type: req.body.event_type,
        latitude: req.body.latitude,
        longitude: req.body.longitude
      },
      include: {
        user: {
          include: { role: true }
        }
      }
    });

    await prisma.serviceOrderStatusHistory.create({
      data: {
        service_order_id: req.params.id,
        estado_anterior: order.estado,
        estado_nuevo: order.estado,
        campo_modificado: 'location_event',
        valor_anterior: null,
        valor_nuevo: `${req.body.event_type}:${req.body.latitude},${req.body.longitude}`,
        comentario: req.body.event_type === 'arrival' ? 'Llegada registrada' : 'Salida registrada',
        usuario_id: req.user.id
      }
    });
    await logEvent({
      entity_type: 'order',
      entity_id: req.params.id,
      event_type: 'updated',
      message: req.body.event_type === 'arrival' ? `Llegada registrada en orden #${shortId(req.params.id)}` : `Salida registrada en orden #${shortId(req.params.id)}`,
      actor_user_id: req.user.id
    });

    res.status(201).json(event);
  }));

  router.post('/:id/materials', validateIdParam, validateBody(materialCreateSchema), asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    const access = ensureOrderAccess(order, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);
    if (isOperationalReadOnly(order)) return sendError(res, 409, READ_ONLY_MESSAGE);

    const material = await prisma.orderMaterial.create({ data: { order_id: req.params.id, ...req.body } });
    await prisma.serviceOrderStatusHistory.create({
      data: {
        service_order_id: req.params.id,
        estado_anterior: order.estado,
        estado_nuevo: order.estado,
        campo_modificado: 'materials',
        valor_anterior: null,
        valor_nuevo: `${material.name} x${material.quantity}`,
        comentario: 'Material agregado',
        usuario_id: req.user.id
      }
    });
    await logEvent({ entity_type: 'order', entity_id: req.params.id, event_type: 'updated', message: `Material agregado en orden #${shortId(req.params.id)}`, actor_user_id: req.user.id });
    res.status(201).json(material);
  }));

  router.patch('/:id/materials/:materialId', validateIdParam, validateBody(materialUpdateSchema), asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    const access = ensureOrderAccess(order, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);
    if (isOperationalReadOnly(order)) return sendError(res, 409, READ_ONLY_MESSAGE);
    const materialExists = await prisma.orderMaterial.findFirst({ where: { id: req.params.materialId, order_id: req.params.id } });
    if (!materialExists) return sendError(res, 404, 'Not found');

    const material = await prisma.orderMaterial.update({ where: { id: req.params.materialId }, data: req.body });
    await prisma.serviceOrderStatusHistory.create({
      data: {
        service_order_id: req.params.id,
        estado_anterior: order.estado,
        estado_nuevo: order.estado,
        campo_modificado: 'materials',
        valor_anterior: null,
        valor_nuevo: `${material.name} x${material.quantity}`,
        comentario: 'Material actualizado',
        usuario_id: req.user.id
      }
    });
    res.json(material);
  }));

  router.delete('/:id/materials/:materialId', validateIdParam, asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    const access = ensureOrderAccess(order, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);
    if (isOperationalReadOnly(order)) return sendError(res, 409, READ_ONLY_MESSAGE);
    const materialExists = await prisma.orderMaterial.findFirst({ where: { id: req.params.materialId, order_id: req.params.id } });
    if (!materialExists) return sendError(res, 404, 'Not found');

    await prisma.orderMaterial.delete({ where: { id: req.params.materialId } });
    await prisma.serviceOrderStatusHistory.create({
      data: {
        service_order_id: req.params.id,
        estado_anterior: order.estado,
        estado_nuevo: order.estado,
        campo_modificado: 'materials',
        valor_anterior: null,
        valor_nuevo: null,
        comentario: 'Material eliminado',
        usuario_id: req.user.id
      }
    });
    res.json({ ok: true });
  }));

  router.put('/:id/technicians', requireRole('admin'), validateIdParam, validateBody(techniciansUpdateSchema), asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    if (!order || order.deleted_at) return sendError(res, 404, 'Not found');
    if (isOperationalReadOnly(order)) return sendError(res, 409, READ_ONLY_MESSAGE);

    const previousIds = order.technicians.map((technician) => technician.technician_id);
    const oldList = previousIds.sort().join(',');
    const newList = [...req.body.technicians].sort().join(',');
    const newlyAdded = req.body.technicians.filter((technicianId) => !previousIds.includes(technicianId));

    await prisma.$transaction(async (db) => {
      await db.serviceOrderTechnician.deleteMany({ where: { service_order_id: req.params.id } });
      if (req.body.technicians.length) {
        await db.serviceOrderTechnician.createMany({
          data: req.body.technicians.map((technicianId) => ({ service_order_id: req.params.id, technician_id: technicianId, asignado_por: req.user.email }))
        });
      }

      await db.serviceOrderStatusHistory.create({
        data: {
          service_order_id: req.params.id,
          estado_anterior: order.estado,
          estado_nuevo: order.estado,
          campo_modificado: 'technicians',
          valor_anterior: oldList || null,
          valor_nuevo: newList || null,
          comentario: 'Cambio de técnicos asignados',
          usuario_id: req.user.id
        }
      });

      if (newlyAdded.length) {
        await notifyAssignedTechnicians(db, {
          orderId: req.params.id,
          technicianIds: newlyAdded,
          title: 'Orden asignada',
          description: `Se te asignó la orden #${shortId(req.params.id)}`,
          kind: 'order_reassignment'
        });
      }
    });

    io.emit('orders:changed', { type: 'tech_assignment', orderId: req.params.id });
    io.emit('dashboard:refresh', { reason: 'technician_assignment' });
    await logEvent({ entity_type: 'order', entity_id: req.params.id, event_type: 'updated', message: `Técnicos reasignados en orden #${shortId(req.params.id)}`, actor_user_id: req.user.id });
    await safeSyncOrderCalendars({ orderId: req.params.id, actorUserId: req.user.id, technicianIds: req.body.technicians });
    res.json({ ok: true });
  }));

  router.post('/:id/invoice-draft', validateIdParam, validateBody(invoiceDraftCreateSchema), asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        materials: true,
        technicians: true,
        invoice_draft: true
      }
    });

    if (!order || order.deleted_at || !order.is_active) return sendError(res, 404, 'Not found');

    const access = ensureOrderAccess(order, req.user);
    if (!access.ok) return sendError(res, access.status, access.message);

    if (order.estado !== 'completado') {
      return sendError(res, 400, 'Solo las órdenes completadas pueden generar un borrador de factura');
    }

    if (order.invoice_draft) {
      const existing = await prisma.invoiceDraft.findUnique({
        where: { id: order.invoice_draft.id },
        include: { order: true, client: true }
      });
      return res.json(existing);
    }

    const baseDraft = buildInvoiceDraftFromOrder(order);
    const laborRate = req.body.labor_rate;
    const laborAmount = Number((baseDraft.labor_hours * laborRate).toFixed(2));
    const materialsAmount = Number(baseDraft.materials_total.toFixed(2));
    const totalAmount = Number((laborAmount + materialsAmount).toFixed(2));

    const created = await prisma.invoiceDraft.create({
      data: {
        order_id: order.id,
        client_id: order.client_id,
        labor_hours: baseDraft.labor_hours,
        labor_rate: laborRate,
        labor_amount: laborAmount,
        materials_amount: materialsAmount,
        total_amount: totalAmount,
        payload: {
          materials: baseDraft.materials,
          generated_from_status: order.estado,
          generated_by_user_id: req.user.id
        }
      },
      include: { order: true, client: true }
    });

    await logEvent({
      entity_type: 'order',
      entity_id: order.id,
      event_type: 'updated',
      message: `Borrador de factura generado para orden #${shortId(order.id)}`,
      actor_user_id: req.user.id
    });

    res.status(201).json(created);
  }));

  return router;
}
