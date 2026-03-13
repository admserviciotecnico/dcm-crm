'use client';

import { ReactNode } from 'react';

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[250] bg-black/60 p-4" onClick={onClose}>
      <div className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-lg animate-[scaleInFade_150ms_ease-out] flex-col rounded-[10px] border border-[var(--border)] bg-[var(--surface)]" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
