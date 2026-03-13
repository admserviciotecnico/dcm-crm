import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('table-ui overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]', className)}><table className="w-full text-sm text-[var(--text-primary)]">{children}</table></div>;
}
