import { OrdersApi } from '@/lib/api/endpoints';

export const ordersService = {
  list: OrdersApi.list,
  create: OrdersApi.create,
  patch: OrdersApi.patch,
  remove: OrdersApi.remove,
  history: OrdersApi.history,
  assignTechnicians: OrdersApi.assignTechnicians
};
