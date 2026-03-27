import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { equipmentCreateSchema, equipmentUpdateSchema } from '../services/schemas.js';
import { logEvent } from '../services/event-log.js';
import { asyncHandler, sendError } from '../utils/http.js';

const MAX_PAGE_SIZE = 50;
const SORT_FIELDS = {
  tipo_equipo: 'tipo_equipo',
  modelo: 'modelo',
  numero_serie: 'numero_serie',
  estado_actual: 'estado_actual',
  created_at: 'created_at'
};

const router = Router();
router.use(authRequired);

router.get('/', asyncHandler(async (req, res) => {
  const usePagination = ['page', 'pageSize', 'q', 'sortBy', 'sortDir'].some((key) => req.query[key] !== undefined);
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '').trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
  const sortBy = SORT_FIELDS[String(req.query.sortBy || 'created_at')] ?? 'created_at';
  const sortDir = String(req.query.sortDir || 'desc') === 'asc' ? 'asc' : 'desc';

  const where = {
    is_active: true,
    deleted_at: null,
    ...(status ? { estado_actual: status } : {}),
    ...(q ? {
      OR: [
        { tipo_equipo: { contains: q, mode: 'insensitive' } },
        { modelo: { contains: q, mode: 'insensitive' } },
        { numero_serie: { contains: q, mode: 'insensitive' } },
        { ubicacion_planta: { contains: q, mode: 'insensitive' } },
        { client: { is: { nombre_empresa: { contains: q, mode: 'insensitive' } } } }
      ]
    } : {})
  };

  if (!usePagination) {
    const items = await prisma.equipment.findMany({ where, orderBy: [{ created_at: 'desc' }] });
    return res.json(items);
  }

  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.equipment.findMany({ where, orderBy: [{ [sortBy]: sortDir }, { created_at: 'desc' }], skip, take: pageSize }),
    prisma.equipment.count({ where })
  ]);
  res.json({ items, total, page, pageSize });
}));

router.post('/', requireRole('admin'), validateBody(equipmentCreateSchema), asyncHandler(async (req, res) => {
  const created = await prisma.equipment.create({ data: req.body });
  await logEvent({ entity_type: 'equipment', entity_id: created.id, event_type: 'created', message: `Equipo creado: ${created.tipo_equipo} ${created.numero_serie}`, actor_user_id: req.user.id });
  res.status(201).json(created);
}));

router.patch('/:id', requireRole('admin'), validateIdParam, validateBody(equipmentUpdateSchema), asyncHandler(async (req, res) => {
  const before = await prisma.equipment.findUnique({ where: { id: req.params.id } });
  if (!before || before.deleted_at) return sendError(res, 404, 'Not found');

  const updated = await prisma.equipment.update({ where: { id: req.params.id }, data: req.body });
  const eventType = req.body.estado_actual && before?.estado_actual !== req.body.estado_actual ? 'status_changed' : 'updated';
  await logEvent({ entity_type: 'equipment', entity_id: updated.id, event_type: eventType, message: eventType === 'status_changed' ? `Estado de equipo cambiado a ${updated.estado_actual}` : `Equipo actualizado: ${updated.tipo_equipo} ${updated.numero_serie}`, actor_user_id: req.user.id });
  res.json(updated);
}));

router.delete('/:id', requireRole('admin'), validateIdParam, asyncHandler(async (req, res) => {
  await prisma.equipment.update({ where: { id: req.params.id }, data: { is_active: false, deleted_at: new Date() } });
  await logEvent({ entity_type: 'equipment', entity_id: req.params.id, event_type: 'deleted', message: 'Equipo desactivado', actor_user_id: req.user.id });
  res.json({ ok: true });
}));

export default router;
