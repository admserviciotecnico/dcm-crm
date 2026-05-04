import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { maintenancePlanCreateSchema, maintenancePlanPatchSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { runMaintenanceScheduler } from '../services/maintenance-scheduler.js';

export default function maintenanceRoutes() {
  const router = Router();
  router.use(authRequired, requireRole('admin'));

  router.get('/maintenance-plans', asyncHandler(async (_req, res) => {
    const items = await prisma.maintenancePlan.findMany({ include: { client: true, equipment: true }, orderBy: [{ next_execution_at: 'asc' }] });
    res.json(items);
  }));

  router.post('/maintenance-plans', validateBody(maintenancePlanCreateSchema), asyncHandler(async (req, res) => {
    const created = await prisma.maintenancePlan.create({ data: req.body, include: { client: true, equipment: true } });
    res.status(201).json(created);
  }));

  router.patch('/maintenance-plans/:id', validateIdParam, validateBody(maintenancePlanPatchSchema), asyncHandler(async (req, res) => {
    const current = await prisma.maintenancePlan.findUnique({ where: { id: req.params.id } });
    if (!current) return sendError(res, 404, 'Not found');
    const updated = await prisma.maintenancePlan.update({ where: { id: req.params.id }, data: req.body, include: { client: true, equipment: true } });
    res.json(updated);
  }));

  router.delete('/maintenance-plans/:id', validateIdParam, asyncHandler(async (req, res) => {
    const current = await prisma.maintenancePlan.findUnique({ where: { id: req.params.id } });
    if (!current) return sendError(res, 404, 'Not found');
    await prisma.maintenancePlan.update({ where: { id: req.params.id }, data: { is_active: false } });
    res.json({ ok: true });
  }));

  router.post('/maintenance/run', asyncHandler(async (req, res) => {
    const result = await runMaintenanceScheduler({ prisma, actorUserId: req.user.id });
    res.json(result);
  }));

  return router;
}
