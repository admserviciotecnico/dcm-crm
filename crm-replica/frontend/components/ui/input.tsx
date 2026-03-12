import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={cn('h-10 w-full rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[#9CA3AF] transition-[background-color,border-color,box-shadow] duration-150 hover:border-[var(--primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(29,78,216,0.15)]', className)}
  />
));

Input.displayName = 'Input';
