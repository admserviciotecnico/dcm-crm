import { ReactNode } from 'react';
import { PriorityBadge, StatusBadge } from '@/components/common/badges';
import { OrderHistory, User } from '@/types/domain';

const FIELD_LABELS: Record<string, string> = {
  estado: 'Estado',
  prioridad: 'Prioridad',
  fecha_programada: 'Fecha programada',
  technicians: 'Técnicos asignados'
};

function parseTechnicianTokens(value: string | null | undefined) {
  if (!value) return [];
  return value.split(',').map((token) => token.trim()).filter(Boolean);
}

function resolveUserLabel(id: string, usersById?: Map<string, User>) {
  const user = usersById?.get(id);
  return user ? `${user.first_name} ${user.last_name}`.trim() : null;
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
  if (field === 'technicians') {
    return formatTechniciansAudit(value, usersById);
  }

  return value;
}

export function getOrderHistoryFieldLabel(field: string | undefined) {
  if (!field) return 'Cambio';
  return FIELD_LABELS[field] ?? field;
}

export function renderOrderHistoryValue(entry: OrderHistory, value: string | null | undefined, usersById?: Map<string, User>) {
  return formatRawValue(entry.campo_modificado, value, usersById);
}
