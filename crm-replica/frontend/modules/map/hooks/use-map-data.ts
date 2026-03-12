'use client';

import { useEffect, useState } from 'react';
import { fetchMapData } from '@/modules/map/services/map-service';

export function useMapData() {
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchMapData();
        setOrders(data.orders);
        setUsers(data.users);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return { orders, users, loading };
}
