import { z } from 'zod';
import { sendError } from '../utils/http.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Validation error', parsed.error.flatten());
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return sendError(res, 400, 'Invalid query parameters', parsed.error.flatten());
    req.validatedQuery = parsed.data;
    next();
  };
}

const idParamSchema = z.object({ id: z.string().min(1) }).strict();

export function validateIdParam(req, res, next) {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, 400, 'Invalid id parameter', parsed.error.flatten());
  next();
}
