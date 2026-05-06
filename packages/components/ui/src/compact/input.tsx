import { Input } from '@usertour-packages/input';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

// 30px tall, 12px text, soft muted surface — designed for dense inspector /
// settings panel rows where bg-muted reads as "passive form field" against
// the bg-background canvas.
export const CompactInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn('h-7.5 rounded-lg bg-muted text-xs shadow-sm md:text-xs', className)}
    {...props}
  />
));
CompactInput.displayName = 'CompactInput';
