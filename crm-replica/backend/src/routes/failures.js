import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

export default function failuresRoutes() {
  const router = Router();
  router.use(authRequired, requireRole('admin'));

  router.get('/stats', asyncHandler(async (_req, res) => {
    const [topTypes, byEquipment, byClient, byResolution] = await Promise.all([
      prisma.failureRecord.groupBy({ by: ['failure_type'], _count: { _all: true }, orderBy: { _count: { failure_type: 'desc' } }, take: 10 }),
      prisma.failureRecord.groupBy({ by: ['equipment_id'], _count: { _all: true }, where: { equipment_id: { not: null } }, orderBy: { _count: { equipment_id: 'desc' } }, take: 10 }),
      prisma.failureRecord.groupBy({ by: ['client_id'], _count: { _all: true }, where: { client_id: { not: null } }, orderBy: { _count: { client_id: 'desc' } }, take: 10 }),
      prisma.failureRecord.groupBy({ by: ['resolution_type'], _count: { _all: true }, orderBy: { _count: { resolution_type: 'desc' } } })
    ]);
    res.json({ top_failure_types: topTypes, failures_by_equipment: byEquipment, failures_by_client: byClient, resolution_distribution: byResolution });
  }));

  router.get('/suggestions', asyncHandler(async (req, res) => {
    const equipmentId = String(req.query.equipment_id || '').trim();
    const failureType = String(req.query.failure_type || '').trim();
    const items = await prisma.failureRecord.findMany({
      where: {
        ...(equipmentId ? { equipment_id: equipmentId } : {}),
        ...(failureType ? { failure_type: { contains: failureType, mode: 'insensitive' } } : {})
      },
      orderBy: { created_at: 'desc' },
      take: 8
    });
    res.json(items);
  }));

  return router;
}
