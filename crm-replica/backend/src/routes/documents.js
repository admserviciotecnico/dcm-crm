import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { documentCreateSchema, documentListSchema } from '../services/schemas.js';
import { logEvent } from '../services/event-log.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const parsed = documentListSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid documents query' });
  }

  const items = await prisma.document.findMany({
    where: {
      entity_type: parsed.data.entityType,
      entity_id: parsed.data.entityId
    },
    orderBy: { created_at: 'desc' }
  });

  return res.json(items);
});

router.post('/', validateBody(documentCreateSchema), async (req, res) => {
  const created = await prisma.document.create({ data: req.body });
  await logEvent({
    entity_type: created.entity_type,
    entity_id: created.entity_id,
    event_type: 'document_added',
    message: `Documento agregado: ${created.file_name}`,
    actor_user_id: req.user.id
  });
  return res.status(201).json(created);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
  await prisma.document.delete({ where: { id: req.params.id } });
  if (existing) {
    await logEvent({
      entity_type: existing.entity_type,
      entity_id: existing.entity_id,
      event_type: 'document_removed',
      message: `Documento eliminado: ${existing.file_name}`,
      actor_user_id: req.user.id
    });
  }
  return res.json({ ok: true });
});

export default router;
