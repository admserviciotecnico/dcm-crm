import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { userAdminUpdateSchema, userProfileUpdateSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';

const router = Router();
router.use(authRequired);

router.get('/', requireRole('admin'), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({ include: { role: true } });
  res.json(users.map((u) => ({ id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role.name, active: u.active })));
}));

router.patch('/me', validateBody(userProfileUpdateSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body });
  res.json({ id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone });
}));

router.patch('/:id', requireRole('admin'), validateIdParam, validateBody(userAdminUpdateSchema), asyncHandler(async (req, res) => {
  if (!req.body.role && req.body.active === undefined) {
    return sendError(res, 400, 'At least one field is required');
  }

  const data = {};
  if (req.body.active !== undefined) {
    data.active = req.body.active;
  }

  if (req.body.role) {
    const role = await prisma.role.findUnique({ where: { name: req.body.role } });
    if (!role) return sendError(res, 400, 'Invalid role');
    data.role_id = role.id;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    include: { role: true }
  });

  res.json({ id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role.name, active: user.active });
}));

export default router;
