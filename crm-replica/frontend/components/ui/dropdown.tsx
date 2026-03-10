'use client';

import { ReactNode, useState } from 'react';

export function Dropdown({ trigger, children, onOpen }: { trigger: ReactNode; children: ReactNode; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => { const next = !open; setOpen(next); if (next && onOpen) onOpen(); }}>{trigger}</button>
      {open ? <div className="absolute right-0 z-20 mt-2 min-w-64 rounded-lg border border-slate-700 bg-slate-900 p-1">{children}</div> : null}
    </div>
  );
}
