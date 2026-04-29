import { Input } from '@usertour-packages/input';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

// 30px tall, 12px text, white surface with a soft border — gives the input a
// clear "you can type here" affordance instead of a muted-pill that reads as
// half-disabled. Matches the chip outer (white + border) so the popover's
// working surface stays consistent with the surrounding chrome.
export const ConditionInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      'h-7.5 rounded-lg border border-input bg-background text-xs shadow-sm md:text-xs',
      className,
    )}
    {...props}
  />
));
ConditionInput.displayName = 'ConditionInput';
