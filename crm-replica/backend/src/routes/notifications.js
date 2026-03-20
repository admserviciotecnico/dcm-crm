import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateIdParam } from '../middleware/validation.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { ensureClientDocumentationNotifications } from '../services/notifications.js';

const MAX_PAGE_SIZE = 50;

const router = Router();
router.use(authRequired);

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
  const skip = (page - 1) * pageSize;

  await ensureClientDocumentationNotifications();

  const where = { user_id: req.user.id };
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: pageSize }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, read: false } })
  ]);

  res.json({ items, total, unread, page, pageSize });
}));

router.post('/:id/read', validateIdParam, asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { id: req.params.id, user_id: req.user.id },
    data: { read: true }
  });

  if (result.count === 0) return sendError(res, 404, 'Not found');
  res.json({ ok: true });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({ where: { user_id: req.user.id, read: false }, data: { read: true } });
  res.json({ ok: true });
}));

export default router;
