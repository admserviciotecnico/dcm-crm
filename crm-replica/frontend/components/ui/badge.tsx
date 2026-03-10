import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-md border border-slate-600 px-2 py-0.5 text-xs font-medium text-slate-200', className)}>{children}</span>;
}
