import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { logEvent } from './event-log.js';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_OAUTH_TOKEN_API = 'https://oauth2.googleapis.com/token';
const GOOGLE_OAUTH_AUTH_API = 'https://accounts.google.com/o/oauth2/v2/auth';

function mustHaveGoogleOAuthConfig() {
  if (!env.calendarGoogleClientId || !env.calendarGoogleClientSecret || !env.calendarGoogleRedirectUri) {
    throw new Error('Google Calendar OAuth no está configurado');
  }
}

function buildGoogleAuthUrl(state) {
  mustHaveGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: env.calendarGoogleClientId,
    redirect_uri: env.calendarGoogleRedirectUri,
    response_type: 'code',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    state
  });
  return `${GOOGLE_OAUTH_AUTH_API}?${params.toString()}`;
}

async function exchangeGoogleAuthCode(code) {
  mustHaveGoogleOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: env.calendarGoogleClientId,
    client_secret: env.calendarGoogleClientSecret,
    redirect_uri: env.calendarGoogleRedirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo intercambiar código OAuth: ${text}`);
  }

  return response.json();
}

async function refreshGoogleAccessToken(connection) {
  if (!connection.refresh_token) return connection;
  mustHaveGoogleOAuthConfig();

  const body = new URLSearchParams({
    refresh_token: connection.refresh_token,
    client_id: env.calendarGoogleClientId,
    client_secret: env.calendarGoogleClientSecret,
    grant_type: 'refresh_token'
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo refrescar token Google: ${text}`);
  }

  const payload = await response.json();
  const next = await prisma.externalCalendarConnection.update({
    where: { id: connection.id },
    data: {
      access_token: payload.access_token,
      expires_at: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : connection.expires_at,
      refresh_token: payload.refresh_token ?? connection.refresh_token
    }
  });
  return next;
}

async function googleRequest(connection, path, { method = 'GET', body } = {}) {
  let activeConnection = connection;
  if (activeConnection.expires_at && new Date(activeConnection.expires_at).getTime() <= Date.now() + 30_000) {
    activeConnection = await refreshGoogleAccessToken(activeConnection);
  }

  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${activeConnection.access_token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function calendarProviderAdapter(provider) {
  if (provider === 'google') {
    return {
      buildAuthUrl: buildGoogleAuthUrl,
      exchangeCode: exchangeGoogleAuthCode,
      createEvent: async (connection, calendarEvent) => {
        const targetCalendarId = connection.external_calendar_id || 'primary';
        const event = await googleRequest(connection, `/calendars/${encodeURIComponent(targetCalendarId)}/events`, {
          method: 'POST',
          body: calendarEvent
        });
        return event?.id;
      },
      updateEvent: async (connection, externalEventId, calendarEvent) => {
        const targetCalendarId = connection.external_calendar_id || 'primary';
        await googleRequest(connection, `/calendars/${encodeURIComponent(targetCalendarId)}/events/${encodeURIComponent(externalEventId)}`, {
          method: 'PUT',
          body: calendarEvent
        });
      },
      deleteEvent: async (connection, externalEventId) => {
        const targetCalendarId = connection.external_calendar_id || 'primary';
        await googleRequest(connection, `/calendars/${encodeURIComponent(targetCalendarId)}/events/${encodeURIComponent(externalEventId)}`, {
          method: 'DELETE'
        });
      }
    };
  }

  throw new Error(`Provider no soportado: ${provider}`);
}

export function mapOrderToCalendarEvent(order) {
  const start = order.fecha_programada ? new Date(order.fecha_programada) : null;
  const end = start ? new Date(start.getTime() + 60 * 60 * 1000) : null;
  return {
    summary: `Orden #${String(order.id).slice(0, 8)} · ${order.client?.nombre_empresa ?? order.client_id}`,
    description: [
      `Estado: ${order.estado}`,
      `Prioridad: ${order.prioridad}`,
      order.observaciones ? `Observaciones: ${order.observaciones}` : null
    ].filter(Boolean).join('\n'),
    location: order.direccion_service || undefined,
    start: start ? { dateTime: start.toISOString() } : undefined,
    end: end ? { dateTime: end.toISOString() } : undefined
  };
}

export function buildCalendarConnectState({ userId, provider }) {
  return jwt.sign({
    sub: userId,
    provider,
    nonce: crypto.randomUUID()
  }, env.jwtSecret, { expiresIn: '15m' });
}

export function parseCalendarConnectState(state) {
  return jwt.verify(state, env.jwtSecret);
}

export function buildCalendarConnectUrl({ provider, userId }) {
  const adapter = calendarProviderAdapter(provider);
  const state = buildCalendarConnectState({ userId, provider });
  return {
    state,
    authorization_url: adapter.buildAuthUrl(state)
  };
}

export async function completeCalendarOAuth({ provider, code }) {
  const adapter = calendarProviderAdapter(provider);
  return adapter.exchangeCode(code);
}

export async function createExternalEventFromOrder({ db = prisma, connection, order, userId }) {
  const adapter = calendarProviderAdapter(connection.provider);
  const payload = mapOrderToCalendarEvent(order);
  const externalEventId = await adapter.createEvent(connection, payload);
  const record = await db.externalCalendarEvent.upsert({
    where: {
      order_id_user_id_provider: {
        order_id: order.id,
        user_id: userId,
        provider: connection.provider
      }
    },
    create: {
      order_id: order.id,
      user_id: userId,
      provider: connection.provider,
      external_event_id: externalEventId,
      sync_status: 'synced',
      last_synced_at: new Date()
    },
    update: {
      external_event_id: externalEventId,
      sync_status: 'synced',
      last_error: null,
      last_synced_at: new Date()
    }
  });
  return record;
}

export async function updateExternalEventFromOrder({ db = prisma, connection, externalEvent, order }) {
  const adapter = calendarProviderAdapter(connection.provider);
  const payload = mapOrderToCalendarEvent(order);
  await adapter.updateEvent(connection, externalEvent.external_event_id, payload);
  return db.externalCalendarEvent.update({
    where: { id: externalEvent.id },
    data: {
      sync_status: 'synced',
      last_error: null,
      last_synced_at: new Date()
    }
  });
}

export async function deleteExternalEvent({ db = prisma, connection, externalEvent }) {
  const adapter = calendarProviderAdapter(connection.provider);
  await adapter.deleteEvent(connection, externalEvent.external_event_id);
  await db.externalCalendarEvent.delete({ where: { id: externalEvent.id } });
}

async function markSyncError({ db, orderId, userId, provider, errorMessage }) {
  await db.externalCalendarEvent.upsert({
    where: {
      order_id_user_id_provider: {
        order_id: orderId,
        user_id: userId,
        provider
      }
    },
    create: {
      order_id: orderId,
      user_id: userId,
      provider,
      external_event_id: `error:${Date.now()}`,
      sync_status: 'error',
      last_error: errorMessage
    },
    update: {
      sync_status: 'error',
      last_error: errorMessage
    }
  });
}

export async function syncOrderCalendarEvents({ db = prisma, orderId, technicianIds, actorUserId = null }) {
  const order = await db.serviceOrder.findUnique({
    where: { id: orderId },
    include: {
      client: true,
      technicians: { include: { technician: true } }
    }
  });
  if (!order) return { processed: 0, synced: 0, errors: 0 };

  const targetTechnicianIds = technicianIds?.length
    ? technicianIds
    : order.technicians.map((item) => item.technician_id);

  if (technicianIds) {
    const staleLinks = await db.externalCalendarEvent.findMany({
      where: {
        order_id: order.id,
        user_id: { notIn: technicianIds }
      }
    });

    for (const stale of staleLinks) {
      const staleConnection = await db.externalCalendarConnection.findFirst({
        where: { user_id: stale.user_id, provider: stale.provider }
      });
      try {
        if (staleConnection && !stale.external_event_id.startsWith('error:')) {
          await deleteExternalEvent({ db, connection: staleConnection, externalEvent: stale });
        } else {
          await db.externalCalendarEvent.delete({ where: { id: stale.id } });
        }
      } catch (error) {
        await markSyncError({
          db,
          orderId: order.id,
          userId: stale.user_id,
          provider: stale.provider,
          errorMessage: error instanceof Error ? error.message : 'Error al remover evento stale'
        });
      }
    }
  }

  let synced = 0;
  let errors = 0;

  for (const technicianId of targetTechnicianIds) {
    const connection = await db.externalCalendarConnection.findFirst({
      where: {
        user_id: technicianId,
        provider: 'google'
      }
    });

    if (!connection) continue;

    const linked = await db.externalCalendarEvent.findUnique({
      where: {
        order_id_user_id_provider: {
          order_id: order.id,
          user_id: technicianId,
          provider: connection.provider
        }
      }
    });

    try {
      if (order.estado === 'cancelado' || !order.fecha_programada) {
        if (linked && !linked.external_event_id.startsWith('error:')) {
          await deleteExternalEvent({ db, connection, externalEvent: linked });
        } else if (linked) {
          await db.externalCalendarEvent.delete({ where: { id: linked.id } });
        }
      } else if (linked && !linked.external_event_id.startsWith('error:')) {
        await updateExternalEventFromOrder({ db, connection, externalEvent: linked, order });
      } else {
        await createExternalEventFromOrder({ db, connection, order, userId: technicianId });
      }

      synced += 1;
    } catch (error) {
      errors += 1;
      const message = error instanceof Error ? error.message : 'Error desconocido de sincronización';
      await markSyncError({ db, orderId: order.id, userId: technicianId, provider: connection.provider, errorMessage: message.slice(0, 1000) });
      await logEvent({
        entity_type: 'order',
        entity_id: order.id,
        event_type: 'updated',
        message: `Error al sincronizar calendario externo para técnico ${technicianId}: ${message}`,
        actor_user_id: actorUserId,
        db
      });
    }
  }

  return { processed: targetTechnicianIds.length, synced, errors };
}
