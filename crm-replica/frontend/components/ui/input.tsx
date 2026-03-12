import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={cn('h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[#9CA3AF] transition-colors hover:border-[var(--primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(29,78,216,0.15)]', className)}
  />
));

Input.displayName = 'Input';
