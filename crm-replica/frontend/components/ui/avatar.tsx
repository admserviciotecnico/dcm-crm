import { cn } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  const letters = name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return <div className={cn('grid h-7 w-7 place-items-center rounded-full bg-[var(--bg-surface-muted)] text-[11px] font-semibold text-[var(--text-primary)]', className)}>{letters}</div>;
}
