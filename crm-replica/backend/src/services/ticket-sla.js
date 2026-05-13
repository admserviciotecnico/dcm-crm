const DEFAULT_TICKET_SLA = {
  low: { response_time_hours: 24, resolution_time_hours: 72 },
  medium: { response_time_hours: 8, resolution_time_hours: 48 },
  high: { response_time_hours: 4, resolution_time_hours: 24 },
  urgent: { response_time_hours: 1, resolution_time_hours: 8 }
};

const PRIORITY_ALIAS = {
  baja: 'low',
  media: 'medium',
  alta: 'high',
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent'
};

export function normalizeTicketPriority(priority) {
  return PRIORITY_ALIAS[String(priority ?? '').toLowerCase()] ?? 'medium';
}

export async function getTicketSlaConfig(db, priority) {
  const normalized = normalizeTicketPriority(priority);
  const config = await db.ticketSLAConfig.findFirst({
    where: {
      priority: normalized,
      client_id: null
    },
    orderBy: { created_at: 'desc' }
  });

  if (config) return config;
  return {
    priority: normalized,
    ...DEFAULT_TICKET_SLA[normalized]
  };
}

export function computeTicketSlaDeadlines(createdAt, config) {
  const base = new Date(createdAt);
  const response = new Date(base.getTime() + (config.response_time_hours * 60 * 60 * 1000));
  const resolution = new Date(base.getTime() + (config.resolution_time_hours * 60 * 60 * 1000));
  return {
    sla_response_deadline: response,
    sla_resolution_deadline: resolution
  };
}

function deadlineStatus(startAt, deadline, completedAt, now = new Date()) {
  if (!deadline) return 'ok';
  if (completedAt) return completedAt > deadline ? 'breach' : 'ok';
  const remaining = deadline.getTime() - now.getTime();
  if (remaining < 0) return 'breach';
  const fullWindow = Math.max(1, deadline.getTime() - startAt.getTime());
  return (remaining / fullWindow) < 0.2 ? 'warning' : 'ok';
}

export function enrichTicketWithSla(ticket, now = new Date()) {
  const responseStatus = deadlineStatus(
    new Date(ticket.created_at),
    ticket.sla_response_deadline ? new Date(ticket.sla_response_deadline) : null,
    ticket.first_response_at ? new Date(ticket.first_response_at) : null,
    now
  );
  const resolutionStatus = deadlineStatus(
    new Date(ticket.created_at),
    ticket.sla_resolution_deadline ? new Date(ticket.sla_resolution_deadline) : null,
    ticket.resolved_at ? new Date(ticket.resolved_at) : null,
    now
  );
  const responseTimeHours = ticket.first_response_at ? ((new Date(ticket.first_response_at).getTime() - new Date(ticket.created_at).getTime()) / (60 * 60 * 1000)) : null;
  const resolutionTimeHours = ticket.resolved_at ? ((new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / (60 * 60 * 1000)) : null;

  return {
    ...ticket,
    sla_status: resolutionStatus,
    sla_response_status: responseStatus,
    sla_resolution_status: resolutionStatus,
    response_time_hours: responseTimeHours,
    resolution_time_hours: resolutionTimeHours
  };
}
