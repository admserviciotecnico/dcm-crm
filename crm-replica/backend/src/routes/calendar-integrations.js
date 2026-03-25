import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam, validateQuery } from '../middleware/validation.js';
import { calendarCallbackQuerySchema, calendarConnectSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';
import {
  buildCalendarConnectUrl,
  completeCalendarOAuth,
  parseCalendarConnectState,
  syncOrderCalendarEvents
} from '../services/calendar-integrations.js';

const router = Router();

router.get('/callback', validateQuery(calendarCallbackQuerySchema), asyncHandler(async (req, res) => {
  let state;
  try {
    state = parseCalendarConnectState(req.validatedQuery.state);
  } catch {
    return sendError(res, 400, 'State inválido o expirado');
  }

  const provider = state.provider;
  const userId = state.sub;
  const token = await completeCalendarOAuth({
    provider,
    code: req.validatedQuery.code
  });

  await prisma.externalCalendarConnection.upsert({
    where: {
      user_id_provider: {
        user_id: userId,
        provider
      }
    },
    create: {
      user_id: userId,
      provider,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null
    },
    update: {
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? undefined,
      expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null
    }
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send('<!doctype html><html><body><script>window.opener&&window.opener.postMessage({type:"calendar_connected"}, "*");window.close();</script><p>Conexión completada. Podés cerrar esta ventana.</p></body></html>');
}));

router.use(authRequired);

router.get('/', asyncHandler(async (req, res) => {
  const items = await prisma.externalCalendarConnection.findMany({
    where: { user_id: req.user.id },
    orderBy: { created_at: 'desc' }
  });

  res.json(items.map((item) => ({
    id: item.id,
    provider: item.provider,
    expires_at: item.expires_at,
    external_calendar_id: item.external_calendar_id,
    created_at: item.created_at,
    updated_at: item.updated_at
  })));
}));

router.post('/connect', validateBody(calendarConnectSchema), asyncHandler(async (req, res) => {
  if (req.body.provider !== 'google') {
    return sendError(res, 400, 'Provider no soportado en esta versión');
  }

  const connect = buildCalendarConnectUrl({ provider: req.body.provider, userId: req.user.id });
  res.json(connect);
}));

router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const connection = await prisma.externalCalendarConnection.findUnique({ where: { id: req.params.id } });
  if (!connection || connection.user_id !== req.user.id) return sendError(res, 404, 'Not found');

  await prisma.externalCalendarEvent.deleteMany({
    where: {
      user_id: req.user.id,
      provider: connection.provider
    }
  });
  await prisma.externalCalendarConnection.delete({ where: { id: connection.id } });

  res.json({ ok: true });
}));

router.get('/orders/:id/status', validateIdParam, asyncHandler(async (req, res) => {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: req.params.id },
    include: { technicians: true }
  });
  if (!order || order.deleted_at || !order.is_active) return sendError(res, 404, 'Not found');

  if (req.user.role.name === 'tecnico') {
    const assigned = order.technicians.some((item) => item.technician_id === req.user.id);
    if (!assigned) return sendError(res, 403, 'Forbidden');
  }

  const statuses = await prisma.externalCalendarEvent.findMany({
    where: { order_id: order.id },
    orderBy: { created_at: 'desc' }
  });
  res.json(statuses);
}));

router.post('/orders/:id/sync', requireRole('admin'), validateIdParam, asyncHandler(async (req, res) => {
  const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
  if (!order || order.deleted_at || !order.is_active) return sendError(res, 404, 'Not found');

  const result = await syncOrderCalendarEvents({ orderId: order.id, actorUserId: req.user.id });
  res.json(result);
}));

export default router;
