import { MapApi, OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { MapOrderMarker, ServiceOrder, TechnicianMapLocation, User } from '@/types/domain';

export async function fetchMapData(role: User['role']) {
  if (role === 'admin') {
    const [orders, technicians, fallbackOrders, users] = await Promise.all([
      MapApi.orders(),
      MapApi.technicians(),
      OrdersApi.list({ page: 1, pageSize: 400 }),
      UsersApi.list()
    ]);
    return { mode: 'admin' as const, mapOrders: orders, mapTechnicians: technicians, orders: fallbackOrders.items, users };
  }

  const [ordersRes, users] = await Promise.all([OrdersApi.list({ page: 1, pageSize: 400 }), UsersApi.list()]);
  return {
    mode: 'fallback' as const,
    mapOrders: [] as MapOrderMarker[],
    mapTechnicians: [] as TechnicianMapLocation[],
    orders: ordersRes.items,
    users
  };
}
