import { STATUS_WORKFLOW, PRIORITY_WEIGHT } from '../utils/workflow.js';

export function canTechnicianTransition(current, next) {
  return (current === 'service_programado' && next === 'en_ejecucion') ||
    (current === 'en_ejecucion' && next === 'completado');
}

export function validateStateTransition({ role, currentState, nextState }) {
  if (!nextState || nextState === currentState) return { ok: true };

  if (role === 'admin') {
    const allowed = STATUS_WORKFLOW[currentState];
    if (!Array.isArray(allowed)) return { ok: true };
    return allowed.includes(nextState)
      ? { ok: true }
      : { ok: false, reason: 'Invalid transition for admin' };
  }

  if (role === 'tecnico') {
    return canTechnicianTransition(currentState, nextState)
      ? { ok: true }
      : { ok: false, reason: 'Invalid transition for technician' };
  }

  return { ok: false, reason: 'Unknown role' };
}

export function validateTechnicianRestrictedFields(patch) {
  const forbidden = ['fecha_programada', 'client_id', 'prioridad', 'prioridad_peso', 'deleted_at'];
  const present = forbidden.filter((field) => patch[field] !== undefined);
  if (present.length) return { ok: false, reason: `Technician cannot modify fields: ${present.join(', ')}` };
  return { ok: true };
}

export function computePriorityWeight(priority) {
  return PRIORITY_WEIGHT[priority] || 2;
}

export function isStructuralChange(oldOrder, patch) {
  const keys = [
    'client_id',
    'prioridad',
    'prioridad_peso',
    'fecha_programada',
    'direccion_service',
    'contacto_planta',
    'telefono_contacto_planta',
    'observaciones',
    'observaciones_cierre',
    'is_active',
    'deleted_at'
  ];

  return keys.some((k) => patch[k] !== undefined && patch[k] !== oldOrder[k]);
}
