import { Input } from '@usertour-packages/input';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

// 30px tall, 12px text, soft muted bg — matches the theme builder v2 rhythm.
export const ConditionInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn('h-7.5 rounded-lg bg-muted text-xs shadow-sm md:text-xs', className)}
    {...props}
  />
));
ConditionInput.displayName = 'ConditionInput';
