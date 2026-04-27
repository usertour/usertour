import { Input } from '@usertour-packages/input';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

export const BuilderInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn('h-7.5 rounded-lg bg-muted text-xs shadow-sm md:text-xs', className)}
    {...props}
  />
));
BuilderInput.displayName = 'BuilderInput';
