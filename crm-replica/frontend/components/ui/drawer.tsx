'use client';

import { ReactNode } from 'react';

export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[240] bg-black/50" onClick={onClose}>
      <aside className="ml-auto h-full w-full max-w-2xl animate-[slideInRight_150ms_ease-out] overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-xl font-semibold">{title}</h3>
        {children}
      </aside>
    </div>
  );
}
