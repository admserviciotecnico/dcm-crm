import { prisma } from '../config/prisma.js';
import { logEvent } from './event-log.js';
import { createNotifications, ORDER_STATUS_LABEL, shortId } from './notifications.js';

export const AUTOMATION_TRIGGER_TYPE = 'delayed_in_status';
export const AUTOMATION_ACTION_TYPE = 'set_priority_alta_notify_admin';

async function fetchAdminIds(db) {
  const admins = await db.user.findMany({ where: { active: true, role: { name: 'admin' } }, select: { id: true } });
  return admins.map((admin) => admin.id);
}

async function fetchActorUserId(db, adminIds) {
  if (adminIds.length) return adminIds[0];
  const fallbackUser = await db.user.findFirst({ where: { active: true }, select: { id: true } });
  return fallbackUser?.id ?? null;
}

async function processRule(db, rule) {
  const thresholdDate = new Date(Date.now() - rule.threshold_hours * 60 * 60 * 1000);
  const candidates = await db.serviceOrder.findMany({
    where: {
      is_active: true,
      deleted_at: null,
      estado: rule.target_status,
      prioridad: { not: 'alta' },
      created_at: { lte: thresholdDate }
    },
    include: { client: true }
  });

  if (!candidates.length) return { ruleId: rule.id, matched: 0, updated: 0 };
  const adminIds = await fetchAdminIds(db);
  const actorUserId = await fetchActorUserId(db, adminIds);
  if (!actorUserId) return { ruleId: rule.id, matched: candidates.length, updated: 0 };
  let updated = 0;

  for (const order of candidates) {
    const patched = await db.serviceOrder.update({
      where: { id: order.id },
      data: { prioridad: 'alta', prioridad_peso: 3 }
    });

    await db.serviceOrderStatusHistory.create({
      data: {
        service_order_id: order.id,
        estado_anterior: patched.estado,
        estado_nuevo: patched.estado,
        campo_modificado: 'prioridad',
        valor_anterior: order.prioridad,
        valor_nuevo: 'alta',
        comentario: `Automatización: escalada por permanencia en ${ORDER_STATUS_LABEL[rule.target_status] ?? rule.target_status}`,
        usuario_id: actorUserId
      }
    });

    if (adminIds.length) {
      await createNotifications(db, adminIds.map((user_id) => ({
        user_id,
        service_order_id: order.id,
        kind: `automation_rule_${rule.id}`,
        title: 'Automatización aplicada',
        description: `La orden #${shortId(order.id)} fue escalada a prioridad alta por permanecer en ${ORDER_STATUS_LABEL[rule.target_status] ?? rule.target_status}`
      })));
    }

    await logEvent({
      entity_type: 'order',
      entity_id: order.id,
      event_type: 'updated',
      message: `Automatización aplicada: prioridad escalada a alta para orden #${shortId(order.id)}`,
      actor_user_id: null,
      db
    });

    updated += 1;
  }

  return { ruleId: rule.id, matched: candidates.length, updated };
}

export async function runAutomationRules({ db = prisma } = {}) {
  const rules = await db.automationRule.findMany({ where: { active: true, trigger_type: AUTOMATION_TRIGGER_TYPE, action_type: AUTOMATION_ACTION_TYPE } });
  const results = [];
  for (const rule of rules) {
    const result = await processRule(db, rule);
    results.push(result);
  }
  return {
    rules: results,
    totalUpdated: results.reduce((sum, result) => sum + result.updated, 0)
  };
}
