import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { technicianLocationSchema, technicianLocationSharingSchema } from '../services/schemas.js';
import { asyncHandler, sendError } from '../utils/http.js';

const router = Router();
router.use(authRequired);
router.use(requireRole('tecnico'));

router.get('/location-sharing', asyncHandler(async (req, res) => {
  const sharing = await prisma.technicianLocationSharing.findUnique({
    where: { user_id: req.user.id }
  });
  res.json({ enabled: sharing?.enabled ?? false, updated_at: sharing?.updated_at ?? null });
}));

router.post('/location-sharing', validateBody(technicianLocationSharingSchema), asyncHandler(async (req, res) => {
  const sharing = await prisma.technicianLocationSharing.upsert({
    where: { user_id: req.user.id },
    create: {
      user_id: req.user.id,
      enabled: req.body.enabled
    },
    update: { enabled: req.body.enabled }
  });

  res.json({ enabled: sharing.enabled, updated_at: sharing.updated_at });
}));

router.post('/location', validateBody(technicianLocationSchema), asyncHandler(async (req, res) => {
  const sharing = await prisma.technicianLocationSharing.findUnique({
    where: { user_id: req.user.id }
  });
  if (!sharing?.enabled) return sendError(res, 400, 'Location sharing está desactivado');

  const created = await prisma.technicianLocation.create({
    data: {
      user_id: req.user.id,
      lat: req.body.lat,
      lng: req.body.lng,
      accuracy: req.body.accuracy
    }
  });
  res.status(201).json(created);
}));

export default router;
