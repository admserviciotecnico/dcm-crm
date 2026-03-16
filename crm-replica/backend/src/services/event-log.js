import { prisma } from '../config/prisma.js';

export async function logEvent(data, db = prisma) {
  return db.eventLog.create({
    data: {
      entity_type: data.entity_type,
      entity_id: data.entity_id ?? null,
      event_type: data.event_type,
      message: data.message,
      actor_user_id: data.actor_user_id ?? null
    }
  });
}
