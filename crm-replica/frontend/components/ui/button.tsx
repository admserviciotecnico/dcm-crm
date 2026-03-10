'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'primary' && 'bg-[var(--accent-primary)] text-white hover:bg-blue-500',
        variant === 'secondary' && 'bg-slate-700 text-slate-100 hover:bg-slate-600',
        variant === 'ghost' && 'bg-transparent text-slate-200 hover:bg-slate-800',
        variant === 'danger' && 'bg-[var(--danger)] text-white hover:bg-red-500',
        className
      )}
      {...props}
    />
  );
}
