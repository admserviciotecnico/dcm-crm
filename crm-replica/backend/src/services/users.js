import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

function buildUserMetrics({ user, assignmentsByTechnicianId, activeAssignmentsByTechnicianId, completedAssignmentsByTechnicianId, overdueAssignmentsByTechnicianId, lastAssignmentByTechnicianId }) {
  if (user.role?.name !== 'tecnico') {
    return {
      assigned_orders: 0,
      active_orders: 0,
      completed_orders: 0,
      overdue_orders: 0,
      last_assignment_at: null
    };
  }

  return {
    assigned_orders: assignmentsByTechnicianId.get(user.id) ?? 0,
    active_orders: activeAssignmentsByTechnicianId.get(user.id) ?? 0,
    completed_orders: completedAssignmentsByTechnicianId.get(user.id) ?? 0,
    overdue_orders: overdueAssignmentsByTechnicianId.get(user.id) ?? 0,
    last_assignment_at: lastAssignmentByTechnicianId.get(user.id) ?? null
  };
}

export async function createUserAccount(payload) {
  const role = await prisma.role.findUnique({ where: { name: payload.role } });
  if (!role) return { ok: false, error: 'Invalid role', status: 400 };

  const hash = await bcrypt.hash(payload.password, 10);
  const user = await prisma.user.create({
    data: {
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      password: hash,
      role_id: role.id
    },
    include: { role: true }
  });

  return { ok: true, user };
}

export function toSafeUser(user, metrics) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role.name,
    active: user.active,
    created_at: user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at ?? null,
    updated_at: user.updated_at instanceof Date ? user.updated_at.toISOString() : user.updated_at ?? null,
    last_activity_at: (user.updated_at instanceof Date ? user.updated_at.toISOString() : user.updated_at ?? null)
      ?? (user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at ?? null)
      ?? metrics?.last_assignment_at,
    metrics: metrics ?? {
      assigned_orders: 0,
      active_orders: 0,
      completed_orders: 0,
      overdue_orders: 0,
      last_assignment_at: null
    }
  };
}

export function buildSafeUsers(users, assignments) {
  const assignmentsByTechnicianId = new Map();
  const activeAssignmentsByTechnicianId = new Map();
  const completedAssignmentsByTechnicianId = new Map();
  const overdueAssignmentsByTechnicianId = new Map();
  const lastAssignmentByTechnicianId = new Map();
  const now = Date.now();

  for (const assignment of assignments) {
    const technicianId = assignment.technician_id;
    assignmentsByTechnicianId.set(technicianId, (assignmentsByTechnicianId.get(technicianId) ?? 0) + 1);

    if (assignment.service_order?.estado === 'completado') {
      completedAssignmentsByTechnicianId.set(technicianId, (completedAssignmentsByTechnicianId.get(technicianId) ?? 0) + 1);
    } else if (assignment.service_order?.estado !== 'cancelado') {
      activeAssignmentsByTechnicianId.set(technicianId, (activeAssignmentsByTechnicianId.get(technicianId) ?? 0) + 1);
    }

    const scheduledAt = assignment.service_order?.fecha_programada ? new Date(assignment.service_order.fecha_programada).getTime() : null;
    const isOverdue = scheduledAt !== null && scheduledAt < now && !['completado', 'cancelado'].includes(assignment.service_order?.estado ?? '');
    if (isOverdue) {
      overdueAssignmentsByTechnicianId.set(technicianId, (overdueAssignmentsByTechnicianId.get(technicianId) ?? 0) + 1);
    }

    const assignedAt = assignment.fecha_asignacion instanceof Date ? assignment.fecha_asignacion.toISOString() : assignment.fecha_asignacion;
    const previous = lastAssignmentByTechnicianId.get(technicianId);
    if (assignedAt && (!previous || assignedAt > previous)) {
      lastAssignmentByTechnicianId.set(technicianId, assignedAt);
    }
  }

  return users.map((user) => toSafeUser(user, buildUserMetrics({
    user,
    assignmentsByTechnicianId,
    activeAssignmentsByTechnicianId,
    completedAssignmentsByTechnicianId,
    overdueAssignmentsByTechnicianId,
    lastAssignmentByTechnicianId
  })));
}
