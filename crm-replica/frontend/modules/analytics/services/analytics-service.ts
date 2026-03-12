import { OrdersApi, UsersApi } from '@/lib/api/endpoints';
import { AnalyticsDataset } from '@/modules/analytics/types';

export async function fetchAnalyticsDataset(): Promise<AnalyticsDataset> {
  const [ordersRes, users] = await Promise.all([OrdersApi.list({ page: 1, pageSize: 600 }), UsersApi.list()]);
  return { orders: ordersRes.items, users };
}
