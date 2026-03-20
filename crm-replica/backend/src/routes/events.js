import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validation.js';
import { eventsListSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';

const router = Router();
router.use(authRequired);

router.get('/', validateQuery(eventsListSchema), asyncHandler(async (req, res) => {
  const { entityType, entityId, limit, offset, cursor } = req.validatedQuery;

  if (cursor && offset !== undefined) {
    return sendError(res, 400, 'Use either cursor or offset pagination, not both');
  }

  const where = {
    ...(entityType ? { entity_type: entityType } : {}),
    ...(entityId ? { entity_id: entityId } : {})
  };

  const query = {
    where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(offset !== undefined ? { skip: offset } : {}),
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  };

  const rows = await prisma.eventLog.findMany(query);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return res.json({
    items,
    page: {
      limit,
      offset: offset ?? null,
      nextCursor,
      hasMore
    }
  });
}));

export default router;
