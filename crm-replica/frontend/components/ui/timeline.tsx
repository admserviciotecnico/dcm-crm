import { ReactNode } from 'react';

export function Timeline({ children }: { children: ReactNode }) {
  return <div className="space-y-3 border-l border-[var(--border)] pl-4">{children}</div>;
}

export function TimelineItem({ title, subtitle }: { title: ReactNode; subtitle: ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute -left-[1.1rem] top-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}
