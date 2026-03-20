import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateBody, validateIdParam, validateQuery } from '../middleware/validation.js';
import { documentCreateSchema, documentListSchema } from '../services/schemas.js';
import { logEvent } from '../services/event-log.js';
import { asyncHandler, sendError } from '../utils/http.js';

const router = Router();
router.use(authRequired);

router.get('/', validateQuery(documentListSchema), asyncHandler(async (req, res) => {
  const { entityType, entityId, limit, offset } = req.validatedQuery;

  const items = await prisma.document.findMany({
    where: {
      entity_type: entityType,
      entity_id: entityId
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(offset !== undefined ? { skip: offset } : {})
  });

  return res.json({
    items,
    page: {
      limit,
      offset: offset ?? 0,
      hasMore: items.length === limit
    }
  });
}));

router.post('/', validateBody(documentCreateSchema), asyncHandler(async (req, res) => {
  const created = await prisma.document.create({ data: req.body });
  await logEvent({
    entity_type: created.entity_type,
    entity_id: created.entity_id,
    event_type: 'document_added',
    message: `Documento agregado: ${created.file_name}`,
    actor_user_id: req.user.id
  });
  return res.status(201).json(created);
}));

router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!existing) return sendError(res, 404, 'Document not found');

  await prisma.document.delete({ where: { id: req.params.id } });
  await logEvent({
    entity_type: existing.entity_type,
    entity_id: existing.entity_id,
    event_type: 'document_removed',
    message: `Documento eliminado: ${existing.file_name}`,
    actor_user_id: req.user.id
  });

  return res.json({ ok: true });
}));

export default router;
