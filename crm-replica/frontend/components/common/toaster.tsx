'use client';

import { useEffect } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { appStore } from '@/stores/app-store';

export function Toaster() {
  const toasts = appStore((s) => s.toasts);
  const remove = appStore((s) => s.removeToast);

  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => remove(t.id), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, remove]);

  return (
    <div className="fixed right-4 top-4 z-[300] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="animate-[slideIn_.2s_ease] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-sm shadow-xl">
          <div className="flex items-center gap-2 px-4 py-3">
            {t.type === 'success' ? <CheckCircle2 className="text-emerald-400" size={16} /> : t.type === 'error' ? <XCircle className="text-red-400" size={16} /> : <Info className="text-blue-400" size={16} />}
            <span>{t.message}</span>
          </div>
          <div className={`h-1 w-full ${t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
        </div>
      ))}
    </div>
  );
}
