import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateBody, validateIdParam, validateQuery } from '../middleware/validation.js';
import { documentCreateSchema, documentListSchema } from '../services/schemas.js';
import { logEvent } from '../services/event-log.js';
import { asyncHandler, sendError } from '../utils/http.js';

const router = Router();
router.use(authRequired);

async function canAccessDocumentEntity(user, entityType, entityId) {
  if (!user) return false;
  if (user.role?.name === 'admin') return true;
  if (user.role?.name !== 'tecnico') return false;

  if (entityType === 'order') {
    const assigned = await prisma.serviceOrder.findFirst({
      where: {
        id: entityId,
        is_active: true,
        deleted_at: null,
        technicians: { some: { technician_id: user.id } }
      },
      select: { id: true }
    });
    return !!assigned;
  }

  // No robust ownership model for technicians on client/equipment docs.
  return false;
}

router.get('/', validateQuery(documentListSchema), asyncHandler(async (req, res) => {
  const { entityType, entityId, limit, offset } = req.validatedQuery;
  const allowed = await canAccessDocumentEntity(req.user, entityType, entityId);
  if (!allowed) return sendError(res, 403, 'Forbidden');

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
  const allowed = await canAccessDocumentEntity(req.user, req.body.entity_type, req.body.entity_id);
  if (!allowed) return sendError(res, 403, 'Forbidden');

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
  const allowed = await canAccessDocumentEntity(req.user, existing.entity_type, existing.entity_id);
  if (!allowed) return sendError(res, 403, 'Forbidden');

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
