'use client';

import { useEffect, useState } from 'react';
import { MapOrderMarker, ServiceOrder, TechnicianMapLocation, User } from '@/types/domain';
import { fetchMapData } from '@/modules/map/services/map-service';

export function useMapData(role: User['role']) {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [mapOrders, setMapOrders] = useState<MapOrderMarker[]>([]);
  const [mapTechnicians, setMapTechnicians] = useState<TechnicianMapLocation[]>([]);
  const [mode, setMode] = useState<'admin' | 'fallback'>('fallback');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchMapData(role);
        setMode(data.mode);
        setMapOrders(data.mapOrders);
        setMapTechnicians(data.mapTechnicians);
        setOrders(data.orders);
        setUsers(data.users);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [role]);

  return { orders, users, mapOrders, mapTechnicians, mode, loading };
}
