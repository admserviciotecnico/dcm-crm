import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { portalAuthRequired } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { portalLoginSchema, portalTicketCreateSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { ORDER_STATUS_LABEL, shortId } from '../services/notifications.js';
import { createSimplePdf } from '../utils/pdf.js';
import { computeTicketSlaDeadlines, getTicketSlaConfig } from '../services/ticket-sla.js';

const router = Router();

const PORTAL_ORDER_INCLUDE = {
  client: true,
  materials: true,
  invoice_draft: true
};
const DUPLICATE_TICKET_WARNING = 'Ya existe un reclamo reciente para este equipo. Podés continuar o revisar el anterior.';
const SAFE_ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt', '.doc', '.docx']);

function mapPortalOrder(order) {
  const delayed = Boolean(
    order.fecha_programada
    && new Date(order.fecha_programada).getTime() < Date.now()
    && order.estado !== 'completado'
    && order.estado !== 'cancelado'
  );

  return {
    id: order.id,
    client_id: order.client_id,
    direccion_service: order.direccion_service,
    descripcion: order.descripcion,
    prioridad: order.prioridad,
    estado: order.estado,
    fecha_programada: order.fecha_programada,
    delayed,
    sla_due_at: order.sla_due_at,
    observaciones: order.observaciones,
    observaciones_cierre: order.observaciones_cierre,
    tiempo_trabajado_horas: order.tiempo_trabajado_horas,
    created_at: order.created_at,
    updated_at: order.updated_at,
    client: order.client ? { id: order.client.id, nombre_empresa: order.client.nombre_empresa } : null,
    materials: order.materials,
    invoice_draft: order.invoice_draft,
    short_id: shortId(order.id),
    status_label: ORDER_STATUS_LABEL[order.estado] ?? order.estado,
    warranty_status: order.warranty_status,
    coverage: order.coverage,
    warranty_reason: order.warranty_reason,
    reviewed_at: order.reviewed_at
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

async function getPortalTicket(ticketId, portalUser) {
  return prisma.ticket.findFirst({
    where: {
      id: ticketId,
      client_id: portalUser.client_id,
      deleted_at: null
    },
    include: {
      events: {
        orderBy: { created_at: 'desc' }
      }
    }
  });
}

function isSafeAttachment(attachment) {
  const lowerName = String(attachment.file_name || '').toLowerCase();
  const extension = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
  const safePath = !attachment.file_path || /^https?:\/\//i.test(String(attachment.file_path));
  return SAFE_ATTACHMENT_EXTENSIONS.has(extension) && safePath;
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

router.get('/tickets', asyncHandler(async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: {
      client_id: req.portalUser.client_id,
      deleted_at: null
    },
    select: {
      id: true,
      serial_number: true,
      issue_description: true,
      status: true,
      priority: true,
      warranty_status: true,
      coverage: true,
      created_at: true
    },
    orderBy: [{ created_at: 'desc' }]
  });
  res.json(tickets);
}));

router.get('/tickets/:id', validateIdParam, asyncHandler(async (req, res) => {
  const ticket = await getPortalTicket(req.params.id, req.portalUser);
  if (!ticket) return sendError(res, 404, 'Not found');
  const prefix = `[ticket ${ticket.id.slice(0, 8)}] `;
  const attachments = await prisma.document.findMany({
    where: {
      entity_type: 'client',
      entity_id: req.portalUser.client_id,
      file_name: { startsWith: prefix }
    },
    orderBy: [{ created_at: 'desc' }]
  });
  res.json({
    id: ticket.id,
    serial_number: ticket.serial_number,
    issue_description: ticket.issue_description,
    status: ticket.status,
    priority: ticket.priority,
    created_at: ticket.created_at,
    diagnosis_result: ticket.diagnosis_result,
    requires_intervention: ticket.requires_intervention,
    warranty_status: ticket.warranty_status,
    coverage: ticket.coverage,
    warranty_reason: ticket.warranty_reason,
    reviewed_at: ticket.reviewed_at,
    attachments: attachments.map((doc) => ({
      id: doc.id,
      filename: doc.file_name.replace(prefix, ''),
      url: doc.file_path ?? null
    })),
    timeline: ticket.events.map((event) => ({
      id: event.id,
      ticket_id: event.ticket_id,
      type: event.type,
      message: event.message,
      metadata: event.metadata,
      created_at: event.created_at
    }))
  });
}));

router.post('/tickets', validateBody(portalTicketCreateSchema), asyncHandler(async (req, res) => {
  const { serial_number, issue_description, attachments = [] } = req.body;
  const duplicate = await prisma.ticket.findFirst({
    where: {
      client_id: req.portalUser.client_id,
      serial_number,
      created_at: { gte: new Date(Date.now() - (24 * 60 * 60 * 1000)) },
      status: { notIn: ['closed'] },
      deleted_at: null
    },
    orderBy: { created_at: 'desc' }
  });

  const created = await prisma.$transaction(async (db) => {
    const now = new Date();
    const slaConfig = await getTicketSlaConfig(db, 'media');
    const deadlines = computeTicketSlaDeadlines(now, slaConfig);
    const ticket = await db.ticket.create({
      data: {
        client_id: req.portalUser.client_id,
        serial_number,
        issue_description,
        channel: 'web',
        status: 'new',
        priority: 'media',
        ...deadlines
      }
    });

    await db.ticketEvent.create({
      data: {
        ticket_id: ticket.id,
        type: 'created_from_portal',
        message: 'Ticket creado desde portal cliente'
      }
    });

    if (attachments.length) {
      const safeAttachments = attachments.filter(isSafeAttachment);
      if (safeAttachments.length) {
        try {
          await db.document.createMany({
            data: safeAttachments.map((attachment) => ({
              entity_type: 'client',
              entity_id: req.portalUser.client_id,
              file_name: `[ticket ${ticket.id.slice(0, 8)}] ${attachment.file_name}`,
              file_category: attachment.file_category ?? 'other',
              file_path: attachment.file_path
            }))
          });
        } catch {
          await db.ticketEvent.create({
            data: {
              ticket_id: ticket.id,
              type: 'attachment_ingest_failed',
              message: 'No se pudieron registrar algunos adjuntos del portal'
            }
          });
        }
      }
    }

    return ticket;
  });

  const responseTicket = {
    id: created.id,
    serial_number: created.serial_number,
    issue_description: created.issue_description,
    status: created.status,
    priority: created.priority,
    warranty_status: created.warranty_status,
    coverage: created.coverage,
    created_at: created.created_at
  };

  res.status(201).json({
    ticket: responseTicket,
    warning: duplicate ? DUPLICATE_TICKET_WARNING : null
  });
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
