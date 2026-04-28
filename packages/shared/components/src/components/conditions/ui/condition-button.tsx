import { Button } from '@usertour-packages/button';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

interface Props extends ButtonProps {
  // The visual size — `default` is 30px high, `sm` is 24px (used for inline
  // chips next to inputs).
  size?: 'default' | 'sm';
}

// Default 30px button matching the theme builder rhythm. Caller can pass any
// shadcn Button variant via `variant`.
export const ConditionButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, size = 'default', ...props }, ref) => (
    <Button
      ref={ref}
      className={cn(
        'rounded-lg text-xs shadow-sm',
        size === 'default' ? 'h-7.5 px-3' : 'h-6 px-2',
        className,
      )}
      {...props}
    />
  ),
);
ConditionButton.displayName = 'ConditionButton';
