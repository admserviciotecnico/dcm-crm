import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { clientCreateSchema, clientUpdateSchema } from '../services/schemas.js';
import { logEvent } from '../services/event-log.js';
import { asyncHandler, sendError } from '../utils/http.js';

const MAX_PAGE_SIZE = 50;
const SORT_FIELDS = {
  nombre_empresa: 'nombre_empresa',
  email: 'email',
  fecha_vencimiento_documentacion: 'fecha_vencimiento_documentacion',
  created_at: 'created_at'
};

function calculateResolutionHours(order) {
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : null;
  const completedAt = order.updated_at ? new Date(order.updated_at).getTime() : null;
  if (!createdAt || !completedAt || completedAt <= createdAt) return null;
  return (completedAt - createdAt) / 3600000;
}

const router = Router();
router.use(authRequired);

router.get('/', asyncHandler(async (req, res) => {
  const usePagination = ['page', 'pageSize', 'q', 'sortBy', 'sortDir'].some((key) => req.query[key] !== undefined);
  const q = String(req.query.q || '').trim();
  const expired = String(req.query.expired || '') === '1';
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
  const sortBy = SORT_FIELDS[String(req.query.sortBy || 'created_at')] ?? 'created_at';
  const sortDir = String(req.query.sortDir || 'desc') === 'asc' ? 'asc' : 'desc';

  const where = {
    is_active: true,
    deleted_at: null,
    ...(expired ? { fecha_vencimiento_documentacion: { lt: new Date() } } : {}),
    ...(q ? {
      OR: [
        { nombre_empresa: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { persona_contacto: { contains: q, mode: 'insensitive' } },
        { telefono: { contains: q, mode: 'insensitive' } },
        { observaciones: { contains: q, mode: 'insensitive' } }
      ]
    } : {})
  };

  if (!usePagination) {
    const items = await prisma.client.findMany({ where, orderBy: [{ created_at: 'desc' }] });
    return res.json(items);
  }

  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.client.findMany({ where, orderBy: [{ [sortBy]: sortDir }, { created_at: 'desc' }], skip, take: pageSize }),
    prisma.client.count({ where })
  ]);
  res.json({ items, total, page, pageSize });
}));

router.get('/:id/health', validateIdParam, asyncHandler(async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!client || client.deleted_at || !client.is_active) return sendError(res, 404, 'Not found');

  const [orders, materials, events] = await Promise.all([
    prisma.serviceOrder.findMany({ where: { client_id: req.params.id, is_active: true, deleted_at: null } }),
    prisma.orderMaterial.findMany({ where: { order: { client_id: req.params.id, is_active: true, deleted_at: null } } }),
    prisma.eventLog.findMany({ where: { entity_type: 'client', entity_id: req.params.id }, orderBy: { created_at: 'desc' }, take: 1 })
  ]);

  const completed = orders.filter((order) => order.estado === 'completado');
  const completedOnTime = completed.filter((order) => order.fecha_programada && order.updated_at <= order.fecha_programada).length;
  const completedLate = Math.max(0, completed.length - completedOnTime);
  const avgResolutionHoursValues = completed.map(calculateResolutionHours).filter((value) => typeof value === 'number');
  const avgResolutionHours = avgResolutionHoursValues.length ? Math.round(avgResolutionHoursValues.reduce((sum, value) => sum + value, 0) / avgResolutionHoursValues.length) : null;
  const lastOrderDate = orders.map((order) => order.updated_at ?? order.created_at).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
  const lastActivityDate = events[0]?.created_at ?? lastOrderDate;
  const onTimeRate = completed.length ? Math.round((completedOnTime / completed.length) * 100) : null;

  const docStatus = !client.fecha_vencimiento_documentacion
    ? 'sin_fecha'
    : client.fecha_vencimiento_documentacion < new Date()
      ? 'vencida'
      : client.fecha_vencimiento_documentacion.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000
        ? 'proxima_a_vencer'
        : 'vigente';

  res.json({
    total_orders: orders.length,
    completed_on_time: completedOnTime,
    completed_late: completedLate,
    avg_resolution_hours: avgResolutionHours,
    last_interaction_at: lastActivityDate,
    on_time_rate: onTimeRate,
    documentation_status: docStatus,
    materials_summary: {
      total_items: materials.length,
      estimated_cost: Number(materials.reduce((sum, material) => sum + (material.quantity * material.unit_cost), 0).toFixed(2))
    }
  });
}));

router.post('/', requireRole('admin'), validateBody(clientCreateSchema), asyncHandler(async (req, res) => {
  const created = await prisma.client.create({ data: req.body });
  await logEvent({ entity_type: 'client', entity_id: created.id, event_type: 'created', message: `Cliente creado: ${created.nombre_empresa}`, actor_user_id: req.user.id });
  res.status(201).json(created);
}));

router.patch('/:id', requireRole('admin'), validateIdParam, validateBody(clientUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.deleted_at) return sendError(res, 404, 'Not found');

  const updated = await prisma.client.update({ where: { id: req.params.id }, data: req.body });
  await logEvent({ entity_type: 'client', entity_id: updated.id, event_type: 'updated', message: `Cliente actualizado: ${updated.nombre_empresa}`, actor_user_id: req.user.id });
  res.json(updated);
}));

router.delete('/:id', requireRole('admin'), validateIdParam, asyncHandler(async (req, res) => {
  const hasActiveOrders = await prisma.serviceOrder.count({ where: { client_id: req.params.id, is_active: true, deleted_at: null } });
  if (hasActiveOrders > 0) return sendError(res, 400, 'Cannot delete client with active orders');

  await prisma.client.update({ where: { id: req.params.id }, data: { is_active: false, deleted_at: new Date() } });
  await logEvent({ entity_type: 'client', entity_id: req.params.id, event_type: 'deleted', message: 'Cliente desactivado', actor_user_id: req.user.id });
  res.json({ ok: true });
}));

export default router;
