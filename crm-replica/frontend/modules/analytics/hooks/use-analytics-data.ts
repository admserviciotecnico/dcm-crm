'use client';

import { useEffect, useMemo, useState } from 'react';
import { ServiceOrder, User } from '@/types/domain';
import { fetchAnalyticsDataset } from '@/modules/analytics/services/analytics-service';
import { AnalyticsFilters } from '@/modules/analytics/types';
import { applyAnalyticsFilters } from '@/modules/analytics/utils/aggregations';

export function useAnalyticsData(filters: AnalyticsFilters) {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchAnalyticsDataset();
        setOrders(data.orders);
        setUsers(data.users);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const filteredOrders = useMemo(() => applyAnalyticsFilters(orders, filters), [orders, filters]);

  return { orders: filteredOrders, users, loading };
}
