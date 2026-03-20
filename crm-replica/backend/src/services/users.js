import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

export async function createUserAccount(payload) {
  const role = await prisma.role.findUnique({ where: { name: payload.role } });
  if (!role) return { ok: false, error: 'Invalid role', status: 400 };

  const hash = await bcrypt.hash(payload.password, 10);
  const user = await prisma.user.create({
    data: {
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      password: hash,
      role_id: role.id
    },
    include: { role: true }
  });

  return { ok: true, user };
}

export function toSafeUser(user) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role.name,
    active: user.active
  };
}
