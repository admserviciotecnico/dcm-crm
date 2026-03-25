import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { sendError } from '../utils/http.js';

function readBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export async function authRequired(req, res, next) {
  const token = readBearerToken(req);
  if (!token) return sendError(res, 401, 'Unauthorized');
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.kind && payload.kind !== 'user') return sendError(res, 401, 'Unauthorized');
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!user || !user.active) return sendError(res, 401, 'Unauthorized');
    req.user = user;
    next();
  } catch {
    return sendError(res, 401, 'Unauthorized');
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role.name)) {
      return sendError(res, 403, 'Forbidden');
    }
    next();
  };
}

export async function portalAuthRequired(req, res, next) {
  const token = readBearerToken(req);
  if (!token) return sendError(res, 401, 'Unauthorized');

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.kind !== 'portal') return sendError(res, 401, 'Unauthorized');

    const portalUser = await prisma.portalUser.findUnique({
      where: { id: payload.sub },
      include: { client: true }
    });

    if (!portalUser || !portalUser.active) return sendError(res, 401, 'Unauthorized');
    req.portalUser = portalUser;
    next();
  } catch {
    return sendError(res, 401, 'Unauthorized');
  }
}
