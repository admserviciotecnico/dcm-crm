'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/api/socket';

export function useRealtime(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const socket = getSocket();
    const handler = () => onRefreshRef.current();
    socket.on('orders:changed', handler);
    socket.on('orders:status_changed', handler);
    socket.on('dashboard:refresh', handler);

    return () => {
      socket.off('orders:changed', handler);
      socket.off('orders:status_changed', handler);
      socket.off('dashboard:refresh', handler);
    };
  }, []);
}
