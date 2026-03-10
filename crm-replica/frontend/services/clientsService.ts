import { ClientsApi } from '@/lib/api/endpoints';

export const clientsService = {
  list: ClientsApi.list,
  create: ClientsApi.create,
  update: ClientsApi.update,
  remove: ClientsApi.remove
};
