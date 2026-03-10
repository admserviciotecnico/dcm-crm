'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-600 bg-slate-900 p-1">
      {items.map((item) => (
        <button key={item} onClick={() => onChange(item)} className={cn('rounded-md px-3 py-1.5 text-sm capitalize text-slate-300', value === item && 'bg-blue-600 text-white')}>
          {item}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ children }: { children: ReactNode }) { return <div>{children}</div>; }
