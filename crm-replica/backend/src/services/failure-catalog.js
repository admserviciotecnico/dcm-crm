const BAD_PATTERNS = [/^fix$/i, /^no anda$/i, /^n\/a$/i, /^na$/i, /^ok$/i, /^-+$/];

export function validateFailureQuality({ rootCause, solution }) {
  const rc = String(rootCause ?? '').trim();
  const sl = String(solution ?? '').trim();
  if (rc.length < 10 || sl.length < 10) return { ok: false, message: 'Causa raíz y solución deben tener al menos 10 caracteres' };
  if (BAD_PATTERNS.some((p) => p.test(rc)) || BAD_PATTERNS.some((p) => p.test(sl))) return { ok: false, message: 'Diagnóstico final demasiado genérico. Ingresá detalle técnico' };
  return { ok: true };
}

export async function upsertFailureCatalogFromRecord(db, record) {
  const existing = await db.failureCatalog.findFirst({ where: { failure_type: record.failure_type, failure_category: record.failure_category } });
  if (existing) {
    await db.failureCatalog.update({ where: { id: existing.id }, data: { usage_count: { increment: 1 }, common_root_cause: record.root_cause, recommended_solution: record.solution } });
    return existing.id;
  }
  const created = await db.failureCatalog.create({
    data: {
      failure_type: record.failure_type,
      failure_category: record.failure_category,
      common_root_cause: record.root_cause,
      recommended_solution: record.solution,
      usage_count: 1
    }
  });
  return created.id;
}
