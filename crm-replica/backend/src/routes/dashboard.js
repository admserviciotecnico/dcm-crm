import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

router.get('/kpis', asyncHandler(async (req, res) => {
  const today = new Date();
  const fromMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const whereRole = req.user.role.name === 'admin' ? {} : { technicians: { some: { technician_id: req.user.id } } };
  const [orders, clients] = await Promise.all([
    prisma.serviceOrder.findMany({ where: { is_active: true, deleted_at: null, ...whereRole }, include: { technicians: true } }),
    prisma.client.findMany({ where: { is_active: true, deleted_at: null } })
  ]);

  const delayed = orders.filter((o) => o.fecha_programada && o.fecha_programada < today && !['completado', 'cancelado'].includes(o.estado)).length;
  const high = orders.filter((o) => o.prioridad === 'alta' && !['completado', 'cancelado'].includes(o.estado)).length;
  const completedThisMonth = orders.filter((o) => o.estado === 'completado' && o.updated_at >= fromMonth).length;
  const documentationAlerts = clients.filter((c) => c.fecha_vencimiento_documentacion && c.fecha_vencimiento_documentacion < today).length;

  res.json({
    total_orders: orders.length,
    in_progress: orders.filter((o) => o.estado === 'en_ejecucion').length,
    completed_this_month: completedThisMonth,
    delayed,
    high_priority: high,
    documentation_expired: documentationAlerts
  });
}));

export default router;
