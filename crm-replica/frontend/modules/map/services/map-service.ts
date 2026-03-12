import { OrdersApi, UsersApi } from '@/lib/api/endpoints';

export async function fetchMapData() {
  const [ordersRes, users] = await Promise.all([OrdersApi.list({ page: 1, pageSize: 400 }), UsersApi.list()]);
  return { orders: ordersRes.items, users };
}
