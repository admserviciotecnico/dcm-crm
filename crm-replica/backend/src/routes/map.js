import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

router.get('/orders', requireRole('admin'), asyncHandler(async (_req, res) => {
  const orders = await prisma.serviceOrder.findMany({
    where: {
      is_active: true,
      deleted_at: null,
      estado: { notIn: ['completado', 'cancelado'] }
    },
    include: {
      client: true,
      technicians: { include: { technician: true } },
      location_events: {
        orderBy: { created_at: 'desc' },
        take: 1
      }
    },
    orderBy: { updated_at: 'desc' }
  });

  const withCoordinates = orders
    .filter((order) => order.location_events.length > 0)
    .map((order) => {
      const latestEvent = order.location_events[0];
      return {
        id: order.id,
        client_id: order.client_id,
        client_name: order.client?.nombre_empresa ?? null,
        estado: order.estado,
        prioridad: order.prioridad,
        delayed: order.fecha_programada ? new Date(order.fecha_programada).getTime() < Date.now() && !['completado', 'cancelado'].includes(order.estado) : false,
        direccion_service: order.direccion_service,
        lat: latestEvent.latitude,
        lng: latestEvent.longitude,
        latest_location_at: latestEvent.created_at,
        technicians: order.technicians.map((item) => ({
          id: item.technician_id,
          first_name: item.technician?.first_name ?? '',
          last_name: item.technician?.last_name ?? '',
          email: item.technician?.email ?? ''
        }))
      };
    });

  res.json(withCoordinates);
}));

router.get('/technicians', requireRole('admin'), asyncHandler(async (_req, res) => {
  const latest = await prisma.technicianLocation.findMany({
    distinct: ['user_id'],
    orderBy: [{ user_id: 'asc' }, { captured_at: 'desc' }],
    include: {
      user: {
        include: { role: true }
      }
    }
  });

  const sharing = await prisma.technicianLocationSharing.findMany({
    where: { enabled: true }
  });
  const sharingIds = new Set(sharing.map((item) => item.user_id));

  const active = latest
    .filter((item) => item.user?.role?.name === 'tecnico' && sharingIds.has(item.user_id))
    .map((item) => ({
      user_id: item.user_id,
      first_name: item.user?.first_name ?? '',
      last_name: item.user?.last_name ?? '',
      email: item.user?.email ?? '',
      lat: item.lat,
      lng: item.lng,
      accuracy: item.accuracy,
      captured_at: item.captured_at
    }));

  res.json(active);
}));

export default router;
