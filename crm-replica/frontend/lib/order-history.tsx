import { ReactNode } from 'react';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { OrderHistory, User } from '@/types/domain';

const FIELD_LABELS: Record<string, string> = {
  estado: 'Estado',
  prioridad: 'Prioridad',
  fecha_programada: 'Fecha programada',
  technicians: 'Técnicos asignados',
  materials: 'Materiales',
  observaciones_cierre: 'Observaciones de cierre',
  tiempo_trabajado_horas: 'Horas trabajadas',
  checklist_cierre: 'Checklist de cierre',
  firma_cliente: 'Firma del cliente',
  foto_trabajo_url: 'Foto del trabajo'
};

function parseTechnicianTokens(value: string | null | undefined) {
  if (!value) return [];
  return value.split(',').map((token) => token.trim()).filter(Boolean);
}

function resolveUserLabel(id: string, usersById?: Map<string, User>) {
  const user = usersById?.get(id);
  return user ? `${user.first_name} ${user.last_name}`.trim() : null;
}

function formatChecklistValue(value: string | null | undefined) {
  if (!value) return <span className="text-[var(--text-secondary)]">—</span>;
  try {
    const parsed = JSON.parse(value) as Record<string, boolean>;
    return Object.entries(parsed).map(([key, checked]) => `${key.replace(/_/g, ' ')}: ${checked ? 'sí' : 'no'}`).join(' · ');
  } catch {
    return value;
  }
}

export function formatTechniciansAudit(value: string | null | undefined, usersById?: Map<string, User>) {
  const tokens = parseTechnicianTokens(value);
  if (tokens.length === 0) return <span className="text-[var(--text-secondary)]">—</span>;

  const resolvedNames = tokens.map((token) => resolveUserLabel(token, usersById)).filter((name): name is string => Boolean(name));
  if (resolvedNames.length > 0) return resolvedNames.join(', ');
  return `${tokens.length} técnicos asignados`;
}

function formatRawValue(field: string | undefined, value: string | null | undefined, usersById?: Map<string, User>): ReactNode {
  if (!value) return <span className="text-[var(--text-secondary)]">—</span>;

  if (field === 'estado') return <StatusBadge value={value as Parameters<typeof StatusBadge>[0]['value']} />;
  if (field === 'prioridad') return <PriorityBadge value={value as Parameters<typeof PriorityBadge>[0]['value']} />;
  if (field === 'fecha_programada') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }
  if (field === 'technicians') return formatTechniciansAudit(value, usersById);
  if (field === 'checklist_cierre') return formatChecklistValue(value);
  if (field === 'tiempo_trabajado_horas') return `${value} h`;

  return value;
}

export function getOrderHistoryFieldLabel(field: string | undefined) {
  if (!field) return 'Cambio';
  return FIELD_LABELS[field] ?? field;
}

export function renderOrderHistoryValue(entry: OrderHistory, value: string | null | undefined, usersById?: Map<string, User>) {
  return formatRawValue(entry.campo_modificado, value, usersById);
}
