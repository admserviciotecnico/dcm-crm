import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { validateIdParam } from '../middleware/validation.js';
import { asyncHandler, sendError } from '../utils/http.js';

const router = Router();
router.use(authRequired);

function mapInvoiceDraft(draft) {
  return {
    ...draft,
    order: draft.order ? {
      id: draft.order.id,
      estado: draft.order.estado,
      created_at: draft.order.created_at,
      updated_at: draft.order.updated_at
    } : undefined,
    client: draft.client ? {
      id: draft.client.id,
      nombre_empresa: draft.client.nombre_empresa,
      email: draft.client.email
    } : undefined
  };
}

router.get('/:id', validateIdParam, asyncHandler(async (req, res) => {
  const draft = await prisma.invoiceDraft.findUnique({
    where: { id: req.params.id },
    include: {
      order: { include: { technicians: true } },
      client: true
    }
  });

  if (!draft) return sendError(res, 404, 'Not found');

  if (req.user.role.name === 'tecnico') {
    const assigned = draft.order?.technicians?.some((item) => item.technician_id === req.user.id);
    if (!assigned) return sendError(res, 403, 'Forbidden');
  }

  res.json(mapInvoiceDraft(draft));
}));

export default router;
