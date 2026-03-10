import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-auto rounded-xl border border-[var(--border)]', className)}><table className="w-full text-sm">{children}</table></div>;
}
