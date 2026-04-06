import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { prisma } from '../config/prisma.js';
import { orderStatusCreateSchema, orderStatusPatchSchema } from '../services/schemas.js';
import { listOrderStatuses } from '../services/order-status-config.js';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

function isSafeColor(value) {
  return HEX_COLOR.test(String(value ?? '').trim());
}

export default function orderStatusesRoutes() {
  const router = Router();
  router.use(authRequired);

  router.get('/', asyncHandler(async (_req, res) => {
    const items = await listOrderStatuses({ includeInactive: true });
    res.json(items);
  }));

  router.post('/', requireRole('admin'), validateBody(orderStatusCreateSchema), asyncHandler(async (req, res) => {
    const payload = req.body;
    if (!isSafeColor(payload.color)) return sendError(res, 400, 'Color inválido. Usá formato hex #RRGGBB');

    const created = await prisma.orderStatusConfig.create({
      data: {
        key: payload.key,
        label: payload.label,
        color: payload.color,
        sort_order: payload.sort_order ?? 999,
        is_active: payload.is_active ?? true,
        is_system: false
      }
    });
    res.status(201).json(created);
  }));

  router.patch('/:id', requireRole('admin'), validateIdParam, validateBody(orderStatusPatchSchema), asyncHandler(async (req, res) => {
    const current = await prisma.orderStatusConfig.findUnique({ where: { id: req.params.id } });
    if (!current) return sendError(res, 404, 'Not found');

    if (req.body.color && !isSafeColor(req.body.color)) return sendError(res, 400, 'Color inválido. Usá formato hex #RRGGBB');

    if (req.body.key && req.body.key !== current.key) {
      if (current.is_system) return sendError(res, 400, 'No se puede cambiar la clave de un estado del sistema');
      const usage = await prisma.serviceOrder.count({ where: { estado: current.key } });
      if (usage > 0) return sendError(res, 400, 'No se puede cambiar la clave de un estado ya utilizado por órdenes');
    }

    if (req.body.is_system !== undefined) return sendError(res, 400, 'is_system no es editable');

    const updated = await prisma.orderStatusConfig.update({
      where: { id: req.params.id },
      data: {
        key: req.body.key,
        label: req.body.label,
        color: req.body.color,
        sort_order: req.body.sort_order,
        is_active: req.body.is_active
      }
    });

    res.json(updated);
  }));

  return router;
}
