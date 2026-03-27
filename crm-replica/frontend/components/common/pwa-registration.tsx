'use client';

import { useEffect } from 'react';

export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  return null;
}
