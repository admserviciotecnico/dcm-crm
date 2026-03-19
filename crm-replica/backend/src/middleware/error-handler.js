import { Prisma } from '@prisma/client';
import { HttpError, sendError } from '../utils/http.js';

export function notFoundHandler(req, res) {
  return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(err, _req, res, _next) {
  if (res.headersSent) return;

  if (err instanceof HttpError) {
    return sendError(res, err.status, err.message, err.details);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return sendError(res, 404, 'Resource not found');
    if (err.code === 'P2002') return sendError(res, 409, 'Conflict: duplicated value');
    if (err.code === 'P2003') return sendError(res, 400, 'Invalid relation reference');
    return sendError(res, 400, 'Database request error');
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, 400, 'Database validation error');
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return sendError(res, 500, 'Internal server error');
}
