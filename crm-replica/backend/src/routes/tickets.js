import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { createTicketSchema, TICKET_ALLOWED_STATUSES, updateTicketSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { computePriorityWeight } from '../services/order-rules.js';

const MAX_PAGE_SIZE = 100;

function buildUpdateEventMessage(current, patch) {
  const changes = [];
  if (patch.status && patch.status !== current.status) changes.push(`status changed from '${current.status}' to '${patch.status}'`);
  if (patch.priority && patch.priority !== current.priority) changes.push(`priority changed from '${current.priority}' to '${patch.priority}'`);
  if (patch.category !== undefined && patch.category !== current.category) changes.push(`category changed from '${current.category ?? '-'}' to '${patch.category ?? '-'}'`);
  if (patch.issue_description && patch.issue_description !== current.issue_description) changes.push('issue_description changed');
  return changes.length ? changes.join(' · ') : 'Ticket updated';
}

const TICKET_STATUS_SET = new Set(TICKET_ALLOWED_STATUSES);
const INVALID_TICKET_FOR_ORDER_MESSAGE = 'Ticket inválido o no disponible para generar orden';

export default function ticketsRoutes() {
  const router = Router();
  router.use(authRequired, requireRole('admin'));

  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
    const status = String(req.query.status || '').trim();
    const priority = String(req.query.priority || '').trim();
    const clientId = String(req.query.client_id || '').trim();
    const q = String(req.query.q || '').trim();
    const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';

    const where = {
      ...(includeDeleted ? {} : { deleted_at: null }),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(clientId ? { client_id: clientId } : {}),
      ...(q ? {
        OR: [
          { issue_description: { contains: q, mode: 'insensitive' } },
          { serial_number: { contains: q, mode: 'insensitive' } },
          { client: { is: { nombre_empresa: { contains: q, mode: 'insensitive' } } } }
        ]
      } : {})
    };

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          client: true,
          service_orders: {
            select: { id: true },
            orderBy: { created_at: 'desc' },
            take: 1
          }
        },
        orderBy: [{ created_at: 'desc' }],
        skip,
        take: pageSize
      }),
      prisma.ticket.count({ where })
    ]);

    res.json({ items, total });
  }));

  router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
    const item = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        events: {
          orderBy: { created_at: 'desc' }
        },
        service_orders: {
          select: { id: true },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!item || item.deleted_at) return sendError(res, 404, 'Not found');
    res.json(item);
  }));

  router.post('/', validateBody(createTicketSchema), asyncHandler(async (req, res) => {
    const created = await prisma.$transaction(async (db) => {
      const ticket = await db.ticket.create({ data: req.body, include: { client: true } });
      await db.ticketEvent.create({
        data: {
          ticket_id: ticket.id,
          type: 'created',
          message: 'Ticket creado'
        }
      });
      return ticket;
    });

    res.status(201).json(created);
  }));

  router.patch('/:id', validateIdParam, validateBody(updateTicketSchema), asyncHandler(async (req, res) => {
    if (!Object.keys(req.body).length) return sendError(res, 400, 'At least one field is required');

    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!current || current.deleted_at) return sendError(res, 404, 'Not found');
    if (req.body.status && !TICKET_STATUS_SET.has(req.body.status)) return sendError(res, 400, 'Estado de ticket inválido');
    if (current.status === 'closed' && req.body.status && req.body.status !== 'closed') {
      return sendError(res, 409, 'El ticket cerrado no puede volver a estados abiertos sin lógica de reapertura');
    }

    const updateMessage = buildUpdateEventMessage(current, req.body);

    const updated = await prisma.$transaction(async (db) => {
      const ticket = await db.ticket.update({
        where: { id: req.params.id },
        data: req.body,
        include: { client: true }
      });

      if (req.body.status && req.body.status !== current.status) {
        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'status_changed',
            message: buildUpdateEventMessage(current, req.body)
          }
        });
      }
      if (updateMessage !== 'Ticket updated') {
        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'updated',
            message: updateMessage
          }
        });
      }

      return ticket;
    });

    res.json(updated);
  }));

  router.delete('/:id', validateIdParam, asyncHandler(async (req, res) => {
    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!current || current.deleted_at) return sendError(res, 404, 'Not found');

    await prisma.$transaction(async (db) => {
      await db.ticket.update({
        where: { id: req.params.id },
        data: { deleted_at: new Date() }
      });
      await db.ticketEvent.create({
        data: {
          ticket_id: req.params.id,
          type: 'deleted',
          message: 'Ticket eliminado (soft delete)'
        }
      });
    });

    res.json({ ok: true });
  }));

  router.post('/:id/escalate', validateIdParam, asyncHandler(async (req, res) => {
    let order;
    try {
      order = await prisma.$transaction(async (db) => {
        const [ticket] = await db.$queryRaw`
          SELECT *
          FROM "Ticket"
          WHERE id = ${req.params.id}
          FOR UPDATE
        `;
        if (!ticket || ticket.deleted_at) {
          const error = new Error(INVALID_TICKET_FOR_ORDER_MESSAGE);
          error.httpStatus = 400;
          throw error;
        }
        if (ticket.status === 'closed') {
          const error = new Error('No se puede escalar un ticket cerrado');
          error.httpStatus = 409;
          throw error;
        }

        const existingLinkedOrders = await db.serviceOrder.count({
          where: {
            ticket_id: ticket.id,
            deleted_at: null
          }
        });
        if (existingLinkedOrders > 0) {
          await db.ticketEvent.create({
            data: {
              ticket_id: ticket.id,
              type: 'escalated_multiple',
              message: 'Ticket ya tenía órdenes asociadas'
            }
          });
        }

        const createdOrder = await db.serviceOrder.create({
          data: {
            client_id: ticket.client_id,
            ticket_id: ticket.id,
            prioridad: ticket.priority,
            prioridad_peso: computePriorityWeight(ticket.priority),
            estado: 'presupuesto_generado',
            observaciones: ticket.equipment_id
              ? `${ticket.issue_description}\n\nEquipo relacionado: ${ticket.equipment_id}`
              : ticket.issue_description
          },
          include: {
            client: true,
            ticket: true
          }
        });

        await db.ticket.update({
          where: { id: ticket.id },
          data: { status: 'escalated' }
        });

        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'escalated',
            message: `Escalado a orden #${createdOrder.id.slice(0, 8)}`
          }
        });

        return createdOrder;
      });
    } catch (error) {
      if (error?.httpStatus) return sendError(res, error.httpStatus, error.message);
      throw error;
    }

    res.status(201).json(order);
  }));

  return router;
}
