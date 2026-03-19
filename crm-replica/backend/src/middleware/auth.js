import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { sendError } from '../utils/http.js';

export async function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return sendError(res, 401, 'Unauthorized');
  try {
    const payload = jwt.verify(auth.slice(7), env.jwtSecret);
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
