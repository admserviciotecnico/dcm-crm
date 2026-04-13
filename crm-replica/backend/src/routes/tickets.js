import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { createTicketSchema, TICKET_ALLOWED_STATUSES, updateTicketSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';

const MAX_PAGE_SIZE = 100;

function buildUpdateEventMessage(current, patch) {
  if (patch.status && patch.status !== current.status) {
    return `Estado actualizado: ${current.status} → ${patch.status}`;
  }
  return 'Ticket actualizado';
}

const TICKET_STATUS_SET = new Set(TICKET_ALLOWED_STATUSES);

export default function ticketsRoutes() {
  const router = Router();
  router.use(authRequired, requireRole('admin'));

  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
    const status = String(req.query.status || '').trim();
    const q = String(req.query.q || '').trim();

    const where = {
      ...(status ? { status } : {}),
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
      prisma.ticket.findMany({ where, include: { client: true }, orderBy: [{ created_at: 'desc' }], skip, take: pageSize }),
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
        }
      }
    });

    if (!item) return sendError(res, 404, 'Not found');
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
    if (!current) return sendError(res, 404, 'Not found');
    if (req.body.status && !TICKET_STATUS_SET.has(req.body.status)) return sendError(res, 400, 'Estado de ticket inválido');
    if (current.status === 'closed' && req.body.status && req.body.status !== 'closed') {
      return sendError(res, 409, 'El ticket cerrado no puede volver a estados abiertos sin lógica de reapertura');
    }

    const changedFields = [];
    if (req.body.priority && req.body.priority !== current.priority) changedFields.push(`prioridad: ${current.priority} → ${req.body.priority}`);
    if (req.body.category !== undefined && req.body.category !== current.category) changedFields.push(`categoría: ${current.category ?? '-'} → ${req.body.category ?? '-'}`);
    if (req.body.issue_description && req.body.issue_description !== current.issue_description) changedFields.push('descripción actualizada');

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
      if (changedFields.length) {
        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'updated',
            message: changedFields.join(' · ')
          }
        });
      }

      return ticket;
    });

    res.json(updated);
  }));

  return router;
}
