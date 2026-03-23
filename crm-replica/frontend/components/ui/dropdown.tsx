'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

export function Dropdown({ trigger, children, onOpen }: { trigger: ReactNode; children: ReactNode; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button onClick={() => { const next = !open; setOpen(next); if (next && onOpen) onOpen(); }}>{trigger}</button>
      {open ? <div className="absolute right-0 z-20 mt-2 min-w-64 animate-[fadeSlide_150ms_ease-out] rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-1 shadow-lg">{children}</div> : null}
    </div>
  );
}
