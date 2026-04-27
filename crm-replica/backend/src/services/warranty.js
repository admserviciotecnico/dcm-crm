export const WARRANTY_STATUSES = Object.freeze(['unknown', 'pending_review', 'approved', 'rejected']);
export const WARRANTY_DECISION_STATUSES = new Set(['approved', 'rejected']);
export const WARRANTY_COVERAGES = Object.freeze(['full', 'partial', 'none']);

export function isWarrantyCovered(entity) {
  if (!entity) return false;
  return entity.warranty_status === 'approved' && (entity.coverage === 'full' || entity.coverage === 'partial');
}

export function validateWarrantyPatch({ current, patch, role }) {
  const hasWarrantyChange = [
    'warranty_status',
    'coverage',
    'warranty_reason',
    'warranty_notes'
  ].some((field) => Object.prototype.hasOwnProperty.call(patch, field));

  if (!hasWarrantyChange) {
    return { ok: true, patch };
  }

  const nextStatus = patch.warranty_status ?? current.warranty_status ?? 'unknown';
  const nextCoverage = patch.coverage ?? current.coverage ?? 'none';

  if (Object.prototype.hasOwnProperty.call(patch, 'warranty_status') && !WARRANTY_STATUSES.includes(String(patch.warranty_status))) {
    return { ok: false, status: 400, message: 'Estado de garantía inválido' };
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'coverage') && !WARRANTY_COVERAGES.includes(String(patch.coverage))) {
    return { ok: false, status: 400, message: 'Cobertura de garantía inválida' };
  }

  if (current.warranty_status === 'unknown' && (nextStatus === 'approved' || nextStatus === 'rejected')) {
    return { ok: false, status: 409, message: 'No se puede aprobar/rechazar garantía sin pasar por pendiente de revisión' };
  }
  if (nextStatus !== current.warranty_status && (nextStatus === 'approved' || nextStatus === 'rejected') && current.warranty_status !== 'pending_review') {
    return { ok: false, status: 409, message: 'La decisión de garantía solo puede tomarse desde pendiente de revisión' };
  }

  const changingDecision = nextStatus !== current.warranty_status && WARRANTY_DECISION_STATUSES.has(nextStatus);
  if (changingDecision && role !== 'admin') {
    return { ok: false, status: 403, message: 'Solo administradores pueden aprobar o rechazar garantía' };
  }

  if (nextStatus === 'approved' && !['full', 'partial'].includes(nextCoverage)) {
    return { ok: false, status: 409, message: 'Cuando la garantía se aprueba, la cobertura debe ser total o parcial' };
  }

  if (nextStatus === 'rejected' && nextCoverage !== 'none') {
    return { ok: false, status: 409, message: 'Cuando la garantía se rechaza, la cobertura debe ser none' };
  }

  const nextPatch = { ...patch };
  if (changingDecision) nextPatch.reviewed_at = new Date();

  return { ok: true, patch: nextPatch, decisionTaken: changingDecision };
}

export function applyWarrantyDecisionMetadata({ patch, actorUserId }) {
  if (!WARRANTY_DECISION_STATUSES.has(String(patch.warranty_status))) return patch;
  return {
    ...patch,
    approved_by: actorUserId,
    reviewed_at: patch.reviewed_at ?? new Date()
  };
}
