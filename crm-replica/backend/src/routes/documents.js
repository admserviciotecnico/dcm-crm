import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { documentCreateSchema, documentListSchema } from '../services/schemas.js';

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
  return res.status(201).json(created);
});

router.delete('/:id', async (req, res) => {
  await prisma.document.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

export default router;
