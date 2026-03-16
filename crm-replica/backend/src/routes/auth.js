import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { validateBody } from '../middleware/validation.js';
import { authRequired } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';

const router = Router();

router.post('/register', validateBody(registerSchema), asyncHandler(async (req, res) => {
  const role = await prisma.role.findUnique({ where: { name: req.body.role } });
  if (!role) return sendError(res, 400, 'Invalid role');
  const hash = await bcrypt.hash(req.body.password, 10);
  const user = await prisma.user.create({
    data: { first_name: req.body.first_name, last_name: req.body.last_name, email: req.body.email, password: hash, role_id: role.id }
  });
  res.status(201).json({ id: user.id, email: user.email });
}));

router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email }, include: { role: true } });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) return sendError(res, 401, 'Invalid credentials');
  const access_token = jwt.sign({ sub: user.id, role: user.role.name }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.json({ access_token, token_type: 'bearer' });
}));

router.get('/me', authRequired, asyncHandler(async (req, res) => {
  const { password, ...safe } = req.user;
  res.json({ ...safe, role: req.user.role.name });
}));

export default router;
