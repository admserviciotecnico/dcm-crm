import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { userProfileUpdateSchema } from '../services/schemas.js';
import { asyncHandler } from '../utils/http.js';

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

export default router;
