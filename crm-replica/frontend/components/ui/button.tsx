'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-sm font-medium transition-[background-color,box-shadow,transform] duration-150 hover:-translate-y-px active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[rgba(29,78,216,0.25)] disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]',
        variant === 'secondary' && 'border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]',
        variant === 'ghost' && 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]',
        variant === 'danger' && 'bg-[var(--danger)] text-white hover:opacity-95',
        className
      )}
      {...props}
    />
  );
}
