import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm', className)}>{children}</section>;
}
