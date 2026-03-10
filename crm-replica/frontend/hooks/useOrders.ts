'use client';

import { useCallback, useEffect, useState } from 'react';
import { ServiceOrder } from '@/types/domain';
import { ordersService } from '@/services/ordersService';

export function useOrders(params: Record<string, string | number>) {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersService.list(params);
      setOrders(data.items);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { void load(); }, [load]);

  return { orders, loading, reload: load, setOrders };
}
