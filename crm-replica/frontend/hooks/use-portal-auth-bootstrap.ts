'use client';

import { useEffect } from 'react';
import { PortalAuthApi } from '@/lib/api/endpoints';
import { portalAuthStore } from '@/stores/portal-auth-store';

export function usePortalAuthBootstrap() {
  const token = portalAuthStore((state) => state.token);
  const setUser = portalAuthStore((state) => state.setUser);
  const logout = portalAuthStore((state) => state.logout);

  useEffect(() => {
    if (!token) return;
    PortalAuthApi.me().then(setUser).catch(logout);
  }, [logout, setUser, token]);
}
