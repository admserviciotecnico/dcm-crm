import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validation.js';
import { searchQuerySchema } from '../services/schemas.js';
import { asyncHandler } from '../utils/http.js';
import { toSafeUser } from '../services/users.js';

const router = Router();
router.use(authRequired);

router.get('/', validateQuery(searchQuerySchema), asyncHandler(async (req, res) => {
  const { q, limit } = req.validatedQuery;
  const perGroup = Math.max(1, Math.min(5, Math.ceil(limit / 4)));
  const userWhere = req.user.role.name === 'admin' ? {} : { active: true };

  const [orders, clients, equipments, users] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        ...(req.user.role.name === 'tecnico' ? { technicians: { some: { technician_id: req.user.id } } } : {}),
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { observaciones: { contains: q, mode: 'insensitive' } },
          { client: { is: { nombre_empresa: { contains: q, mode: 'insensitive' } } } }
        ]
      },
      include: { client: true },
      take: perGroup,
      orderBy: { updated_at: 'desc' }
    }),
    prisma.client.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        OR: [
          { nombre_empresa: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { persona_contacto: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: perGroup,
      orderBy: { updated_at: 'desc' }
    }),
    prisma.equipment.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        OR: [
          { tipo_equipo: { contains: q, mode: 'insensitive' } },
          { modelo: { contains: q, mode: 'insensitive' } },
          { numero_serie: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: perGroup,
      orderBy: { updated_at: 'desc' }
    }),
    prisma.user.findMany({
      where: {
        ...userWhere,
        OR: [
          { first_name: { contains: q, mode: 'insensitive' } },
          { last_name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: { role: true },
      take: perGroup,
      orderBy: { updated_at: 'desc' }
    })
  ]);

  res.json({
    orders,
    clients,
    equipments,
    users: users.map((user) => toSafeUser(user))
  });
}));

export default router;
