'use client';

import { ReactNode, useState } from 'react';

export function Dropdown({ trigger, children, onOpen }: { trigger: ReactNode; children: ReactNode; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => { const next = !open; setOpen(next); if (next && onOpen) onOpen(); }}>{trigger}</button>
      {open ? <div className="absolute right-0 z-20 mt-2 min-w-64 animate-[fadeSlide_150ms_ease-out] rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-1 shadow-lg">{children}</div> : null}
    </div>
  );
}
