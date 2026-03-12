import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-[22px] items-center gap-1 rounded-full border px-2 text-xs font-medium', className)}>{children}</span>;
}
