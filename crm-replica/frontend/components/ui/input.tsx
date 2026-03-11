import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={cn('h-10 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none', className)}
  />
));

Input.displayName = 'Input';
