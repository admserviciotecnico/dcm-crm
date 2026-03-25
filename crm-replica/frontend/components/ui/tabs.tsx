'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--bg-surface-muted)] p-1">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
            value === item
              ? 'bg-[var(--primary)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ children }: { children: ReactNode }) { return <div>{children}</div>; }
