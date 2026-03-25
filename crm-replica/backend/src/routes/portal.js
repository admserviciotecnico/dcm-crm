import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { portalAuthRequired } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { portalLoginSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { ORDER_STATUS_LABEL, shortId } from '../services/notifications.js';
import { createSimplePdf } from '../utils/pdf.js';

const router = Router();

const PORTAL_ORDER_INCLUDE = {
  client: true,
  materials: true,
  invoice_draft: true
};

function mapPortalOrder(order) {
  return {
    ...order,
    short_id: shortId(order.id),
    status_label: ORDER_STATUS_LABEL[order.estado] ?? order.estado
  };
}

async function getPortalOrder(orderId, portalUser) {
  const order = await prisma.serviceOrder.findFirst({
    where: {
      id: orderId,
      client_id: portalUser.client_id,
      is_active: true,
      deleted_at: null
    },
    include: PORTAL_ORDER_INCLUDE
  });

  if (!order) return null;
  return order;
}

router.post('/auth/login', validateBody(portalLoginSchema), asyncHandler(async (req, res) => {
  const portalUser = await prisma.portalUser.findUnique({
    where: { email: req.body.email },
    include: { client: true }
  });

  if (!portalUser || !portalUser.active) return sendError(res, 401, 'Invalid credentials');

  const valid = await bcrypt.compare(req.body.password, portalUser.password);
  if (!valid) return sendError(res, 401, 'Invalid credentials');

  await prisma.portalUser.update({
    where: { id: portalUser.id },
    data: { last_login_at: new Date() }
  });

  const access_token = jwt.sign(
    { sub: portalUser.id, kind: 'portal', client_id: portalUser.client_id },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  res.json({
    access_token,
    token_type: 'bearer',
    user: {
      id: portalUser.id,
      email: portalUser.email,
      client_id: portalUser.client_id,
      client_name: portalUser.client?.nombre_empresa ?? null,
      last_login_at: portalUser.last_login_at
    }
  });
}));

router.use(portalAuthRequired);

router.get('/me', asyncHandler(async (req, res) => {
  res.json({
    id: req.portalUser.id,
    email: req.portalUser.email,
    client_id: req.portalUser.client_id,
    client_name: req.portalUser.client?.nombre_empresa ?? null,
    last_login_at: req.portalUser.last_login_at,
    active: req.portalUser.active
  });
}));

router.get('/orders', asyncHandler(async (req, res) => {
  const items = await prisma.serviceOrder.findMany({
    where: {
      client_id: req.portalUser.client_id,
      is_active: true,
      deleted_at: null
    },
    include: PORTAL_ORDER_INCLUDE,
    orderBy: [{ created_at: 'desc' }]
  });

  res.json(items.map(mapPortalOrder));
}));

router.get('/orders/:id', validateIdParam, asyncHandler(async (req, res) => {
  const order = await getPortalOrder(req.params.id, req.portalUser);
  if (!order) return sendError(res, 404, 'Not found');
  res.json(mapPortalOrder(order));
}));

router.get('/orders/:id/history', validateIdParam, asyncHandler(async (req, res) => {
  const order = await getPortalOrder(req.params.id, req.portalUser);
  if (!order) return sendError(res, 404, 'Not found');

  const history = await prisma.serviceOrderStatusHistory.findMany({
    where: { service_order_id: order.id },
    include: { usuario: { include: { role: true } } },
    orderBy: { created_at: 'desc' }
  });

  res.json(history.map((entry) => ({
    id: entry.id,
    campo_modificado: entry.campo_modificado,
    valor_anterior: entry.valor_anterior,
    valor_nuevo: entry.valor_nuevo,
    comentario: entry.comentario,
    created_at: entry.created_at,
    actor_name: `${entry.usuario.first_name ?? ''} ${entry.usuario.last_name ?? ''}`.trim() || entry.usuario.email,
    actor_role: entry.usuario.role?.name ?? null,
    summary: `${entry.campo_modificado ?? 'estado'}: ${entry.valor_anterior ?? '-'} → ${entry.valor_nuevo ?? '-'}`
  })));
}));

router.get('/orders/:id/documents', validateIdParam, asyncHandler(async (req, res) => {
  const order = await getPortalOrder(req.params.id, req.portalUser);
  if (!order) return sendError(res, 404, 'Not found');

  const docs = await prisma.document.findMany({
    where: { entity_type: 'order', entity_id: order.id },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }]
  });

  res.json(docs);
}));

router.get('/orders/:id/pdf', validateIdParam, asyncHandler(async (req, res) => {
  const order = await getPortalOrder(req.params.id, req.portalUser);
  if (!order) return sendError(res, 404, 'Not found');

  const materialsTotal = (order.materials ?? []).reduce((sum, material) => sum + (material.quantity * material.unit_cost), 0);
  const lines = [
    'DCM CRM - Orden de Servicio',
    `Orden: #${shortId(order.id)}`,
    `Cliente: ${order.client?.nombre_empresa ?? order.client_id}`,
    `Estado: ${ORDER_STATUS_LABEL[order.estado] ?? order.estado}`,
    `Prioridad: ${order.prioridad}`,
    `Fecha programada: ${order.fecha_programada ? new Date(order.fecha_programada).toLocaleString() : 'Sin fecha'}`,
    `Observaciones: ${order.observaciones ?? '-'}`,
    `Cierre: ${order.observaciones_cierre ?? '-'}`,
    `Horas trabajadas: ${order.tiempo_trabajado_horas ?? '-'}`,
    `Materiales: ${order.materials?.length ? order.materials.map((material) => `${material.name} x${material.quantity} ($${material.unit_cost})`).join(' | ') : 'Sin materiales'}`,
    `Total materiales: $${materialsTotal.toFixed(2)}`
  ];

  const pdf = createSimplePdf(lines);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="service-order-${shortId(order.id)}.pdf"`);
  res.send(pdf);
}));

router.get('/documents', asyncHandler(async (req, res) => {
  const [clientDocs, orderDocs] = await Promise.all([
    prisma.document.findMany({
      where: { entity_type: 'client', entity_id: req.portalUser.client_id },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }]
    }),
    prisma.document.findMany({
      where: {
        entity_type: 'order',
        entity_id: {
          in: (await prisma.serviceOrder.findMany({
            where: {
              client_id: req.portalUser.client_id,
              is_active: true,
              deleted_at: null
            },
            select: { id: true }
          })).map((order) => order.id)
        }
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }]
    })
  ]);

  res.json({
    client: clientDocs,
    orders: orderDocs
  });
}));

export default router;
