'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { portalAuthStore } from '@/stores/portal-auth-store';
import { usePortalAuthBootstrap } from '@/hooks/use-portal-auth-bootstrap';

export function PortalProtected({ children }: { children: ReactNode }) {
  const token = portalAuthStore((state) => state.token);
  const router = useRouter();

  usePortalAuthBootstrap();

  useEffect(() => {
    if (!token) router.replace('/portal/login');
  }, [router, token]);

  if (!token) return <div className="p-8 text-sm text-[var(--text-secondary)]">Verificando acceso al portal…</div>;
  return <>{children}</>;
}
