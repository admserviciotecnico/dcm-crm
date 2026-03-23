import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { computeSlaDeadline, getSlaStatus } from '../utils/sla.js';

const router = Router();
router.use(authRequired);

function calculateResolutionHours(order) {
  const createdAt = order.created_at ? new Date(order.created_at).getTime() : null;
  const completedAt = order.updated_at ? new Date(order.updated_at).getTime() : null;
  if (!createdAt || !completedAt || completedAt <= createdAt) return null;
  return (completedAt - createdAt) / 3600000;
}

router.get('/kpis', asyncHandler(async (req, res) => {
  const now = new Date();
  const fromMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const avgWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const whereRole = req.user.role.name === 'admin' ? {} : { technicians: { some: { technician_id: req.user.id } } };
  const [orders, clients] = await Promise.all([
    prisma.serviceOrder.findMany({ where: { is_active: true, deleted_at: null, ...whereRole }, include: { technicians: true } }),
    prisma.client.findMany({ where: { is_active: true, deleted_at: null } })
  ]);

  const openOrders = orders.filter((order) => !['completado', 'cancelado'].includes(order.estado));
  const completedOrders = orders.filter((order) => order.estado === 'completado');
  const delayedOrders = openOrders.filter((order) => order.fecha_programada && order.fecha_programada < now);
  const highPriorityOpenOrders = openOrders.filter((order) => order.prioridad === 'alta');
  const completedThisMonth = completedOrders.filter((order) => order.updated_at >= fromMonth).length;
  const completedLastWeek = completedOrders.filter((order) => order.updated_at >= lastWeekStart).length;
  const completedPrevWeek = completedOrders.filter((order) => order.updated_at >= prevWeekStart && order.updated_at < lastWeekStart).length;
  const documentationAlerts = clients.filter((client) => client.fecha_vencimiento_documentacion && client.fecha_vencimiento_documentacion < now).length;

  const recentCompletedResolutionHours = completedOrders
    .filter((order) => order.updated_at >= avgWindowStart)
    .map(calculateResolutionHours)
    .filter((hours) => typeof hours === 'number');
  const avgResolutionHours = recentCompletedResolutionHours.length
    ? Math.round(recentCompletedResolutionHours.reduce((sum, value) => sum + value, 0) / recentCompletedResolutionHours.length)
    : null;

  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.estado] = (acc[order.estado] ?? 0) + 1;
    return acc;
  }, {});

  const openOrdersBySlaStatus = openOrders.reduce((acc, order) => {
    const deadline = computeSlaDeadline(order.created_at, order.prioridad);
    const status = getSlaStatus(deadline, order.estado);
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    total_orders: orders.length,
    open_orders: openOrders.length,
    in_progress: orders.filter((order) => order.estado === 'en_ejecucion').length,
    completed_this_month: completedThisMonth,
    completed_last_week: completedLastWeek,
    completed_prev_week: completedPrevWeek,
    delayed: delayedOrders.length,
    high_priority: highPriorityOpenOrders.length,
    documentation_expired: documentationAlerts,
    sla_breached: openOrdersBySlaStatus.breached ?? 0,
    sla_critical: openOrdersBySlaStatus.critical ?? 0,
    sla_at_risk: (openOrdersBySlaStatus.breached ?? 0) + (openOrdersBySlaStatus.critical ?? 0),
    avg_resolution_hours: avgResolutionHours,
    avg_resolution_days: typeof avgResolutionHours === 'number' ? Number((avgResolutionHours / 24).toFixed(1)) : null,
    sla_compliance_rate: 100,
    orders_by_status: ordersByStatus
  });
}));

export default router;
