import { computePriorityWeight } from './order-rules.js';

const MAX_ORDERS_PER_RUN = 50;
const WINDOW_HOURS = 12;

function computeNextExecutionDate(plan, fromDate) {
  const next = new Date(fromDate);
  const map = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
  const months = plan.frequency_value ?? map[plan.frequency_type] ?? 1;
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function runMaintenanceScheduler({ prisma, actorUserId = null, now = new Date() }) {
  const plans = await prisma.maintenancePlan.findMany({
    where: { is_active: true, next_execution_at: { lte: now } },
    include: { equipment: true },
    orderBy: { next_execution_at: 'asc' },
    take: MAX_ORDERS_PER_RUN
  });

  const summary = { scanned: plans.length, generated: 0, skipped: 0, failed: 0, errors: [] };

  for (const plan of plans) {
    try {
      const windowStart = new Date(plan.next_execution_at);
      windowStart.setHours(windowStart.getHours() - WINDOW_HOURS);
      const windowEnd = new Date(plan.next_execution_at);
      windowEnd.setHours(windowEnd.getHours() + WINDOW_HOURS);

      const duplicated = await prisma.serviceOrder.findFirst({
        where: {
          maintenance_plan_id: plan.id,
          created_at: { gte: windowStart, lte: windowEnd },
          deleted_at: null,
          is_active: true
        }
      });

      if (!plan.auto_generate) {
        await prisma.maintenanceExecution.create({ data: { plan_id: plan.id, status: 'skipped', notes: 'Plan en modo manual; requiere acción manual' } });
        summary.skipped += 1;
        continue;
      }

      if (duplicated) {
        await prisma.maintenanceExecution.create({ data: { plan_id: plan.id, order_id: duplicated.id, status: 'skipped', notes: 'Orden ya existente en ventana de ejecución' } });
        summary.skipped += 1;
        continue;
      }

      const createdOrder = await prisma.serviceOrder.create({
        data: {
          client_id: plan.client_id,
          equipment_id: plan.equipment_id,
          maintenance_plan_id: plan.id,
          estado: 'presupuesto_generado',
          prioridad: 'media',
          prioridad_peso: computePriorityWeight('media'),
          observaciones: 'Mantenimiento preventivo programado'
        }
      });

      const nextExecution = computeNextExecutionDate(plan, plan.next_execution_at);
      await prisma.maintenancePlan.update({ where: { id: plan.id }, data: { last_executed_at: now, next_execution_at: nextExecution } });
      await prisma.maintenanceExecution.create({ data: { plan_id: plan.id, order_id: createdOrder.id, status: 'generated', notes: actorUserId ? `Generado por ${actorUserId}` : 'Generado por scheduler' } });
      summary.generated += 1;
    } catch (error) {
      summary.failed += 1;
      summary.errors.push({ plan_id: plan.id, message: error?.message ?? 'unknown_error' });
      await prisma.maintenanceExecution.create({ data: { plan_id: plan.id, status: 'failed', notes: error?.message ?? 'Error de ejecución' } });
    }
  }

  return summary;
}
