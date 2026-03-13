import { Skeleton } from '@/components/common/skeleton';

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="grid gap-3 border-b border-[var(--border)] p-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 w-20" />)}
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {Array.from({ length: cols }).map((__, c) => <Skeleton key={c} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return <Skeleton className="h-28 w-full rounded-[10px]" />;
}

export function FormSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
