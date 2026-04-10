import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateIdParam } from '../middleware/validation.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { ensureClientDocumentationNotifications } from '../services/notifications.js';

const MAX_PAGE_SIZE = 50;
const THROTTLE_MS = 5 * 60 * 1000;
const ENSURE_DOCS_TASK = 'ensure_client_documentation_notifications';

async function maybeEnsureClientDocumentationNotifications() {
  const now = Date.now();
  const threshold = new Date(now - THROTTLE_MS);
  const marker = await prisma.systemTaskRun.upsert({
    where: { task: ENSURE_DOCS_TASK },
    create: { task: ENSURE_DOCS_TASK, last_run_at: new Date(0) },
    update: {}
  });

  if (marker.last_run_at > threshold) return;

  const lock = await prisma.systemTaskRun.updateMany({
    where: {
      task: ENSURE_DOCS_TASK,
      last_run_at: marker.last_run_at
    },
    data: { last_run_at: new Date(now) }
  });
  if (lock.count === 0) return;
  await ensureClientDocumentationNotifications();
}

const router = Router();
router.use(authRequired);

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
  const skip = (page - 1) * pageSize;

  try {
    await maybeEnsureClientDocumentationNotifications();
  } catch (error) {
    console.error('[notifications] ensureClientDocumentationNotifications failed', error);
  }

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
