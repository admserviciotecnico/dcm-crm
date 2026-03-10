import { ReactNode } from 'react';
import { FileSearch } from 'lucide-react';

export function EmptyState({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-10 text-center">
      <FileSearch className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 text-lg font-semibold">{title}</p>
      <p className="text-sm text-slate-400">{subtitle}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
