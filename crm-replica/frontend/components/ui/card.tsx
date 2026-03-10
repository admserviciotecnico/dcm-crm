import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm', className)}>{children}</section>;
}
