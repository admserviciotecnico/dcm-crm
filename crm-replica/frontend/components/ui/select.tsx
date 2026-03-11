import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    {...props}
    className={cn('h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 focus:border-blue-400 focus:outline-none', className)}
  />
));

Select.displayName = 'Select';
