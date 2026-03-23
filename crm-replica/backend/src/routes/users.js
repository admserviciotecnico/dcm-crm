import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { registerSchema, userAdminUpdateSchema, userProfileUpdateSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { buildSafeUsers, createUserAccount, toSafeUser } from '../services/users.js';

const router = Router();
router.use(authRequired);

router.get('/', asyncHandler(async (_req, res) => {
  const [users, assignments] = await Promise.all([
    prisma.user.findMany({ include: { role: true }, orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }] }),
    prisma.serviceOrderTechnician.findMany({
      include: {
        service_order: {
          select: {
            estado: true,
            fecha_programada: true,
            deleted_at: true,
            is_active: true
          }
        }
      }
    })
  ]);

  const activeAssignments = assignments.filter((assignment) => assignment.service_order?.is_active && !assignment.service_order?.deleted_at);
  res.json(buildSafeUsers(users, activeAssignments));
}));

router.post('/', requireRole('admin'), validateBody(registerSchema), asyncHandler(async (req, res) => {
  const created = await createUserAccount(req.body);
  if (!created.ok) return sendError(res, created.status, created.error);
  res.status(201).json(toSafeUser(created.user));
}));

router.get('/me', asyncHandler(async (req, res) => {
  res.json(toSafeUser(req.user));
}));

router.patch('/me', validateBody(userProfileUpdateSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body, include: { role: true } });
  res.json(toSafeUser(user));
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

  res.json(toSafeUser(user));
}));

export default router;
