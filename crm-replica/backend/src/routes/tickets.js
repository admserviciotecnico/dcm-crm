import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody, validateIdParam } from '../middleware/validation.js';
import { createTicketSchema, TICKET_ALLOWED_STATUSES, updateTicketSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { computePriorityWeight } from '../services/order-rules.js';
import { computeTicketSlaDeadlines, enrichTicketWithSla, getTicketSlaConfig } from '../services/ticket-sla.js';
import { applyWarrantyDecisionMetadata, isBillable, isWarrantyCovered, validateWarrantyPatch } from '../services/warranty.js';

const MAX_PAGE_SIZE = 100;

function buildUpdateEventMessage(current, patch) {
  const changes = [];
  if (patch.status && patch.status !== current.status) changes.push(`status changed from '${current.status}' to '${patch.status}'`);
  if (patch.priority && patch.priority !== current.priority) changes.push(`priority changed from '${current.priority}' to '${patch.priority}'`);
  if (patch.category !== undefined && patch.category !== current.category) changes.push(`category changed from '${current.category ?? '-'}' to '${patch.category ?? '-'}'`);
  if (patch.issue_description && patch.issue_description !== current.issue_description) changes.push('issue_description changed');
  if (patch.diagnosis !== undefined && patch.diagnosis !== current.diagnosis) changes.push('diagnosis updated');
  if (patch.diagnosis_result !== undefined && patch.diagnosis_result !== current.diagnosis_result) changes.push('diagnosis_result updated');
  if (patch.requires_intervention !== undefined && patch.requires_intervention !== current.requires_intervention) changes.push(`requires_intervention set to '${patch.requires_intervention}'`);
  if (patch.warranty_status && patch.warranty_status !== current.warranty_status) changes.push(`warranty_status changed from '${current.warranty_status}' to '${patch.warranty_status}'`);
  if (patch.coverage && patch.coverage !== current.coverage) changes.push(`coverage changed from '${current.coverage}' to '${patch.coverage}'`);
  return changes.length ? changes.join(' · ') : 'Ticket updated';
}

const TICKET_STATUS_SET = new Set(TICKET_ALLOWED_STATUSES);
const INVALID_TICKET_FOR_ORDER_MESSAGE = 'Ticket inválido o no disponible para generar orden';
const READ_ONLY_TICKET_STATUSES = new Set(['resolved_remote', 'closed']);
const FIRST_RESPONSE_STATUSES = new Set(['triage', 'in_diagnosis']);
const RESOLVED_STATUSES = new Set(['resolved_remote', 'closed']);

function validateTicketStatePatch(current, patch) {
  const nextRequiresIntervention = patch.requires_intervention ?? current.requires_intervention;
  const nextStatus = patch.status ?? current.status;
  if (nextStatus === 'escalated' && !nextRequiresIntervention) {
    return { ok: false, status: 409, message: 'No se puede escalar sin marcar que requiere intervención' };
  }
  if (nextStatus === 'resolved_remote' && nextRequiresIntervention) {
    return { ok: false, status: 409, message: 'No se puede resolver en remoto si requiere intervención' };
  }
  return { ok: true };
}

export default function ticketsRoutes() {
  const router = Router();
  router.use(authRequired, requireRole('admin'));

  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize || 20)));
    const status = String(req.query.status || '').trim();
    const statuses = status.includes('|') ? status.split('|').map((entry) => entry.trim()).filter(Boolean) : [];
    const priority = String(req.query.priority || '').trim();
    const clientId = String(req.query.client_id || '').trim();
    const q = String(req.query.q || '').trim();
    const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';

    const where = {
      ...(includeDeleted ? {} : { deleted_at: null }),
      ...(statuses.length ? { status: { in: statuses } } : status ? { status } : {}),
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

    res.json({ items: items.map((ticket) => ({ ...enrichTicketWithSla(ticket), warranty_covered: isWarrantyCovered(ticket), billable: isBillable(ticket) })), total });
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
    res.json({ ...enrichTicketWithSla(item), warranty_covered: isWarrantyCovered(item), billable: isBillable(item) });
  }));

  router.post('/', validateBody(createTicketSchema), asyncHandler(async (req, res) => {
    const created = await prisma.$transaction(async (db) => {
      const now = new Date();
      const slaConfig = await getTicketSlaConfig(db, req.body.priority);
      const deadlines = computeTicketSlaDeadlines(now, slaConfig);
      const ticket = await db.ticket.create({
        data: {
          ...req.body,
          ...deadlines
        },
        include: { client: true }
      });
      await db.ticketEvent.create({
        data: {
          ticket_id: ticket.id,
          type: 'created',
          message: 'Ticket creado'
        }
      });
      return ticket;
    });

    res.status(201).json({ ...enrichTicketWithSla(created), warranty_covered: isWarrantyCovered(created), billable: isBillable(created) });
  }));

  router.patch('/:id', validateIdParam, validateBody(updateTicketSchema), asyncHandler(async (req, res) => {
    if (!Object.keys(req.body).length) return sendError(res, 400, 'At least one field is required');

    const current = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!current || current.deleted_at) return sendError(res, 404, 'Not found');
    if (READ_ONLY_TICKET_STATUSES.has(current.status)) {
      return sendError(res, 409, 'El ticket está en estado final y no puede modificarse');
    }
    if (req.body.status && !TICKET_STATUS_SET.has(req.body.status)) return sendError(res, 400, 'Estado de ticket inválido');
    if (current.status === 'closed' && req.body.status && req.body.status !== 'closed') {
      return sendError(res, 409, 'El ticket cerrado no puede volver a estados abiertos sin lógica de reapertura');
    }
    const diagnosisStarted = !current.diagnosis && typeof req.body.diagnosis === 'string' && req.body.diagnosis.trim().length > 0;
    const shouldAutoMoveToDiagnosis = diagnosisStarted && current.status === 'triage';
    const hasFirstResponseTransition = !current.first_response_at && current.status === 'new' && FIRST_RESPONSE_STATUSES.has(String(req.body.status ?? ''));
    const hasResolutionTransition = !current.resolved_at && RESOLVED_STATUSES.has(String(req.body.status ?? ''));
    const patch = {
      ...req.body,
      ...(shouldAutoMoveToDiagnosis ? { status: 'in_diagnosis' } : {}),
      ...(hasFirstResponseTransition ? { first_response_at: new Date() } : {}),
      ...(hasResolutionTransition ? { resolved_at: new Date() } : {})
    };

    const transitionValidation = validateTicketStatePatch(current, patch);
    if (!transitionValidation.ok) return sendError(res, transitionValidation.status, transitionValidation.message);
    const warrantyValidation = validateWarrantyPatch({ current, patch, role: req.user.role.name });
    if (!warrantyValidation.ok) return sendError(res, warrantyValidation.status, warrantyValidation.message);
    const warrantyAwarePatch = applyWarrantyDecisionMetadata({ patch: warrantyValidation.patch, actorUserId: req.user.id });

    const updateMessage = buildUpdateEventMessage(current, warrantyAwarePatch);
    const diagnosisCompleted = !current.diagnosis_result && typeof warrantyAwarePatch.diagnosis_result === 'string' && warrantyAwarePatch.diagnosis_result.trim().length > 0;
    const interventionRequired = current.requires_intervention !== true && warrantyAwarePatch.requires_intervention === true;

    const updated = await prisma.$transaction(async (db) => {
      const ticket = await db.ticket.update({
        where: { id: req.params.id },
        data: warrantyAwarePatch,
        include: { client: true }
      });

      if (warrantyAwarePatch.status && warrantyAwarePatch.status !== current.status) {
        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'status_changed',
            message: buildUpdateEventMessage(current, warrantyAwarePatch),
            metadata: shouldAutoMoveToDiagnosis ? { from: 'triage', to: 'in_diagnosis', reason: 'auto_on_diagnosis_start' } : undefined
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
      if (diagnosisStarted) {
        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'diagnosis_started',
            message: 'Diagnóstico técnico iniciado'
          }
        });
      }
      if (diagnosisCompleted) {
        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'diagnosis_completed',
            message: 'Diagnóstico técnico completado'
          }
        });
      }
      if (interventionRequired) {
        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'intervention_required',
            message: 'Se sugiere escalar a orden de servicio'
          }
        });
      }
      if (warrantyValidation.decisionTaken) {
        await db.ticketEvent.create({
          data: {
            ticket_id: ticket.id,
            type: 'warranty_decision',
            message: `Garantía ${warrantyAwarePatch.warranty_status === 'approved' ? 'aprobada' : 'rechazada'} por ${req.user.email} (motivo: ${warrantyAwarePatch.warranty_reason ?? '-'})`,
            metadata: {
              coverage: warrantyAwarePatch.coverage,
              reason: warrantyAwarePatch.warranty_reason ?? null,
              approved_by: req.user.id
            }
          }
        });
      }

      return ticket;
    });

    res.json({ ...enrichTicketWithSla(updated), warranty_covered: isWarrantyCovered(updated), billable: isBillable(updated) });
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
        if (!String(ticket.diagnosis_result ?? '').trim()) {
          const error = new Error('Debe completar el diagnóstico antes de escalar a una orden');
          error.httpStatus = 400;
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
            warranty_status: ticket.warranty_status,
            coverage: ticket.coverage,
            warranty_reason: ticket.warranty_reason,
            warranty_notes: ticket.warranty_notes,
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
          data: { status: 'escalated', requires_intervention: true }
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
