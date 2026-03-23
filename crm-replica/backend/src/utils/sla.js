export const SLA_CONFIG = {
  alta: { response: 4, resolution: 8 },
  media: { response: 24, resolution: 24 },
  baja: { response: 72, resolution: 72 }
};

export const SLA_HOURS = {
  alta: SLA_CONFIG.alta.resolution,
  media: SLA_CONFIG.media.resolution,
  baja: SLA_CONFIG.baja.resolution
};

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function computeDeadline(createdAt, hours) {
  const created = normalizeDate(createdAt);
  if (!created) return null;
  return new Date(created.getTime() + hours * 60 * 60 * 1000);
}

export function computeSlaDeadline(createdAt, prioridad = 'media') {
  return computeDeadline(createdAt, SLA_CONFIG[prioridad]?.resolution ?? SLA_CONFIG.media.resolution);
}

export function computeResponseDeadline(createdAt, prioridad = 'media') {
  return computeDeadline(createdAt, SLA_CONFIG[prioridad]?.response ?? SLA_CONFIG.media.response);
}

export function getSlaStatus(slaDeadline, estado) {
  if (estado === 'completado' || estado === 'cancelado') return 'met';

  const deadline = normalizeDate(slaDeadline);
  if (!deadline) return 'ok';

  const diffMs = deadline.getTime() - Date.now();
  if (diffMs <= 0) return 'breached';

  const diffHours = diffMs / (60 * 60 * 1000);
  if (diffHours < 1) return 'critical';
  if (diffHours < 3) return 'warning';
  return 'ok';
}
