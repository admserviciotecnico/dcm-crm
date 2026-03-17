import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { validateBody } from '../middleware/validation.js';
import { authRequired } from '../middleware/auth.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';
import { sendPasswordResetEmail } from '../services/mailer.js';

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

router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });

  if (user) {
    try {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password_reset_token: hashedToken,
          password_reset_expires: expiresAt
        }
      });

      const resetLink = `${env.frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail({ to: user.email, resetLink });
    } catch (error) {
      // Keep response generic to avoid account enumeration and preserve UX consistency.
      // eslint-disable-next-line no-console
      console.error('[forgot-password] failed to generate/send reset token', error);
    }
  }

  return res.json({ ok: true, message: 'Si el email existe, recibirás un enlace de recuperación.' });
}));

router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await prisma.user.findFirst({
    where: {
      password_reset_token: hashedToken,
      password_reset_expires: { gt: new Date() }
    }
  });

  if (!user) return sendError(res, 400, 'Token de recuperación inválido o expirado');

  const hash = await bcrypt.hash(req.body.password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      password_reset_token: null,
      password_reset_expires: null
    }
  });

  return res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
}));

router.get('/me', authRequired, asyncHandler(async (req, res) => {
  const { password, password_reset_token, password_reset_expires, ...safe } = req.user;
  res.json({ ...safe, role: req.user.role.name });
}));

export default router;
