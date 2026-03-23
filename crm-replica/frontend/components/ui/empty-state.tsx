import { ReactNode } from 'react';
import { FileSearch } from 'lucide-react';

export function EmptyState({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface-muted)] p-10 text-center">
      <FileSearch className="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
      <p className="mt-3 text-lg font-semibold">{title}</p>
      <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
