import { EquipmentsApi } from '@/lib/api/endpoints';

export const equipmentsService = {
  list: EquipmentsApi.list,
  create: EquipmentsApi.create,
  update: EquipmentsApi.update,
  remove: EquipmentsApi.remove
};
