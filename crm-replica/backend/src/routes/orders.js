import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { computePriorityWeight, validateStateTransition, validateTechnicianRestrictedFields } from '../services/order-rules.js';
import { validateBody } from '../middleware/validation.js';
import { orderCreateSchema, orderPatchSchema, techniciansUpdateSchema } from '../services/schemas.js';
import { logEvent } from '../services/event-log.js';

const MAX_PAGE_SIZE = 100;

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

  for (const field of ['prioridad', 'fecha_programada']) {
    const prev = before[field] instanceof Date ? before[field].toISOString() : before[field];
    const next = after[field] instanceof Date ? after[field].toISOString() : after[field];
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

export default function ordersRouter(io) {
  const router = Router();
  router.use(authRequired);

  router.get('/', async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
    const { status, technician, client, priority, from, to } = req.query;

    const where = { is_active: true, deleted_at: null };
    if (status) where.estado = status;
    if (client) where.client_id = client;
    if (priority) where.prioridad = priority;
    if (from || to) where.fecha_programada = { gte: from ? new Date(String(from)) : undefined, lte: to ? new Date(String(to)) : undefined };

    if (req.user.role.name === 'tecnico') {
      where.technicians = { some: { technician_id: req.user.id } };
    } else if (technician) {
      where.technicians = { some: { technician_id: String(technician) } };
    }

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.serviceOrder.findMany({ where, include: { technicians: true, client: true }, orderBy: [{ prioridad_peso: 'desc' }, { updated_at: 'desc' }], skip, take: pageSize }),
      prisma.serviceOrder.count({ where })
    ]);
    res.json({ items, total, page, pageSize });
  });

  router.post('/', requireRole('admin'), validateBody(orderCreateSchema), async (req, res) => {
    const { technicians = [], ...data } = req.body;
    data.prioridad_peso = computePriorityWeight(data.prioridad);

    const tx = await prisma.$transaction(async (db) => {
      const order = await db.serviceOrder.create({ data });
      if (technicians.length) {
        await db.serviceOrderTechnician.createMany({
          data: technicians.map((t) => ({ service_order_id: order.id, technician_id: t, asignado_por: req.user.email }))
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
    await logEvent({ entity_type: 'order', entity_id: tx.id, event_type: 'created', message: `Orden creada #${tx.id.slice(0, 8)}`, actor_user_id: req.user.id });
    res.status(201).json(tx);
  });

  router.patch('/:id', validateBody(orderPatchSchema), async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    if (!order || order.deleted_at) return res.status(404).json({ message: 'Not found' });

    const role = req.user.role.name;
    const assigned = order.technicians.some((t) => t.technician_id === req.user.id);
    if (role === 'tecnico' && !assigned) return res.status(403).json({ message: 'Forbidden' });

    if (role === 'tecnico') {
      const restricted = validateTechnicianRestrictedFields(req.body);
      if (!restricted.ok) return res.status(400).json({ message: restricted.reason });
    }

    const transition = validateStateTransition({ role, currentState: order.estado, nextState: req.body.estado });
    if (!transition.ok) return res.status(400).json({ message: transition.reason });

    const patch = { ...req.body };
    if (patch.prioridad) patch.prioridad_peso = computePriorityWeight(patch.prioridad);

    const updated = await prisma.$transaction(async (db) => {
      const newOrder = await db.serviceOrder.update({ where: { id: order.id }, data: patch });
      const historyEntries = toHistoryEntries({ before: order, after: newOrder, userId: req.user.id, comment: req.body.comentario });
      if (historyEntries.length) {
        await db.serviceOrderStatusHistory.createMany({ data: historyEntries });
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
      await logEvent({ entity_type: 'order', entity_id: order.id, event_type: 'updated', message: `Orden actualizada #${order.id.slice(0, 8)}`, actor_user_id: req.user.id });
    }

    res.json(updated);
  });

  router.delete('/:id', requireRole('admin'), async (req, res) => {
    await prisma.serviceOrder.update({ where: { id: req.params.id }, data: { is_active: false, deleted_at: new Date() } });
    io.emit('orders:changed', { type: 'deleted', orderId: req.params.id });
    io.emit('dashboard:refresh', { reason: 'order_deleted' });
    await logEvent({ entity_type: 'order', entity_id: req.params.id, event_type: 'deleted', message: `Orden eliminada #${req.params.id.slice(0, 8)}`, actor_user_id: req.user.id });
    res.json({ ok: true });
  });

  router.get('/:id/history', async (req, res) => {
    const data = await prisma.serviceOrderStatusHistory.findMany({ where: { service_order_id: req.params.id }, include: { usuario: true }, orderBy: { created_at: 'desc' } });
    res.json(data);
  });

  router.put('/:id/technicians', requireRole('admin'), validateBody(techniciansUpdateSchema), async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id }, include: { technicians: true } });
    if (!order || order.deleted_at) return res.status(404).json({ message: 'Not found' });

    const oldList = order.technicians.map((t) => t.technician_id).sort().join(',');
    const newList = [...req.body.technicians].sort().join(',');

    await prisma.$transaction(async (db) => {
      await db.serviceOrderTechnician.deleteMany({ where: { service_order_id: req.params.id } });
      if (req.body.technicians.length) {
        await db.serviceOrderTechnician.createMany({
          data: req.body.technicians.map((t) => ({ service_order_id: req.params.id, technician_id: t, asignado_por: req.user.email }))
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
    });

    io.emit('orders:changed', { type: 'tech_assignment', orderId: req.params.id });
    io.emit('dashboard:refresh', { reason: 'technician_assignment' });
    await logEvent({ entity_type: 'order', entity_id: req.params.id, event_type: 'updated', message: `Técnicos reasignados en orden #${req.params.id.slice(0, 8)}`, actor_user_id: req.user.id });
    res.json({ ok: true });
  });

  return router;
}
