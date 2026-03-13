'use client';

import { ReactNode } from 'react';

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[250] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg animate-[scaleInFade_150ms_ease-out] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
