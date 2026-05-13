import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

export default function failuresRoutes() {
  const router = Router();
  router.use(authRequired, requireRole('admin'));

  router.get('/stats', asyncHandler(async (_req, res) => {
    const [topCatalog, topTypes, byEquipment, byClient, byResolution, trends] = await Promise.all([
      prisma.failureCatalog.findMany({ orderBy: { usage_count: 'desc' }, take: 10 }),
      prisma.failureRecord.groupBy({ by: ['failure_type'], _count: { _all: true }, orderBy: { _count: { failure_type: 'desc' } }, take: 10 }),
      prisma.failureRecord.groupBy({ by: ['equipment_id'], _count: { _all: true }, where: { equipment_id: { not: null } }, orderBy: { _count: { equipment_id: 'desc' } }, take: 10 }),
      prisma.failureRecord.groupBy({ by: ['client_id'], _count: { _all: true }, where: { client_id: { not: null } }, orderBy: { _count: { client_id: 'desc' } }, take: 10 }),
      prisma.failureRecord.groupBy({ by: ['resolution_type'], _count: { _all: true }, orderBy: { _count: { resolution_type: 'desc' } } }),
      prisma.$queryRaw`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS period, count(*)::int AS count FROM "FailureRecord" GROUP BY 1 ORDER BY 1 DESC LIMIT 12`
    ]);
    res.json({ top_failures_catalog: topCatalog, top_failure_types: topTypes, failures_by_equipment: byEquipment, failures_by_client: byClient, resolution_distribution: byResolution, recurrence_trends: trends });
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
  router.get('/catalog', asyncHandler(async (_req, res) => {
    const items = await prisma.failureCatalog.findMany({ orderBy: [{ usage_count: 'desc' }, { updated_at: 'desc' }], take: 50 });
    res.json(items);
  }));

  return router;
}
