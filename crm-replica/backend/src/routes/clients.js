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

router.post('/', requireRole('admin'), validateBody(clientCreateSchema), asyncHandler(async (req, res) => {
  const created = await prisma.client.create({ data: req.body });
  await logEvent({ entity_type: 'client', entity_id: created.id, event_type: 'created', message: `Cliente creado: ${created.nombre_empresa}`, actor_user_id: req.user.id });
  res.status(201).json(created);
}));

router.patch('/:id', requireRole('admin'), validateIdParam, validateBody(clientUpdateSchema), asyncHandler(async (req, res) => {
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
