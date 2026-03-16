import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { eventsListSchema } from '../services/schemas.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const parsed = eventsListSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid events query' });
  }

  const { entityType, entityId, limit = 100 } = parsed.data;
  const where = {
    ...(entityType ? { entity_type: entityType } : {}),
    ...(entityId ? { entity_id: entityId } : {})
  };

  const items = await prisma.eventLog.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit
  });

  return res.json(items);
});

export default router;
