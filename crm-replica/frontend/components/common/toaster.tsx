'use client';

import { useEffect } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { appStore } from '@/stores/app-store';

export function Toaster() {
  const toasts = appStore((s) => s.toasts);
  const remove = appStore((s) => s.removeToast);

  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => remove(t.id), 4500));
    return () => timers.forEach(clearTimeout);
  }, [toasts, remove]);

  return (
    <div className="fixed right-4 top-4 z-[300] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="animate-[fadeSlide_150ms_ease] overflow-hidden rounded-[10px] border text-sm shadow-xl bg-[var(--bg-surface)]">
          <div className={`flex items-center gap-2 px-4 py-3 ${t.type === 'success' ? 'border-l-4 border-emerald-500' : t.type === 'error' ? 'border-l-4 border-red-500' : 'border-l-4 border-blue-500'}`}>
            {t.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={16} /> : t.type === 'error' ? <XCircle className="text-red-500" size={16} /> : <Info className="text-blue-500" size={16} />}
            <span className="flex-1 text-[var(--text-primary)]">{t.message}</span>
            <button onClick={() => remove(t.id)} className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"><X size={14} /></button>
          </div>
          <div className={`h-1 w-full ${t.type === 'success' ? 'bg-emerald-500' : t.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
        </div>
      ))}
    </div>
  );
}
