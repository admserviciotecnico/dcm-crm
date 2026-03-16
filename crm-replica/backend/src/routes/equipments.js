import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { equipmentCreateSchema, equipmentUpdateSchema } from '../services/schemas.js';
import { logEvent } from '../services/event-log.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

router.get('/', asyncHandler(async (_req, res) => {
  const items = await prisma.equipment.findMany({ where: { is_active: true, deleted_at: null }, orderBy: { created_at: 'desc' } });
  res.json(items);
}));

router.post('/', requireRole('admin'), validateBody(equipmentCreateSchema), asyncHandler(async (req, res) => {
  const created = await prisma.equipment.create({ data: req.body });
  await logEvent({ entity_type: 'equipment', entity_id: created.id, event_type: 'created', message: `Equipo creado: ${created.tipo_equipo} ${created.numero_serie}`, actor_user_id: req.user.id });
  res.status(201).json(created);
}));

router.patch('/:id', requireRole('admin'), validateIdParam, validateBody(equipmentUpdateSchema), asyncHandler(async (req, res) => {
  const before = await prisma.equipment.findUnique({ where: { id: req.params.id } });
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
