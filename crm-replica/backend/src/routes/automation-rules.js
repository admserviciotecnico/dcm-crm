import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { automationRuleSchema, automationRuleUpdateSchema } from '../services/schemas.js';
import { runAutomationRules } from '../services/automation-rules.js';
import { asyncHandler, sendError } from '../utils/http.js';

const router = Router();
router.use(authRequired, requireRole('admin'));

router.get('/', asyncHandler(async (_req, res) => {
  const items = await prisma.automationRule.findMany({
    orderBy: [{ created_at: 'desc' }]
  });
  res.json(items);
}));

router.post('/', validateBody(automationRuleSchema), asyncHandler(async (req, res) => {
  const created = await prisma.automationRule.create({ data: req.body });
  res.status(201).json(created);
}));

router.patch('/:id', validateIdParam, validateBody(automationRuleUpdateSchema), asyncHandler(async (req, res) => {
  if (!Object.keys(req.body).length) return sendError(res, 400, 'At least one field is required');
  const updated = await prisma.automationRule.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(updated);
}));

router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  await prisma.automationRule.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.post('/run', asyncHandler(async (_req, res) => {
  const result = await runAutomationRules();
  res.json(result);
}));

export default router;
