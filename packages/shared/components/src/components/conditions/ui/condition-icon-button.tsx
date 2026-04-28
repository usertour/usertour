import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

// Square icon-only button for inline actions (remove condition, open menu).
// Sizes: 24×24 default; 20×20 for tighter contexts (set via className).
export const ConditionIconButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded transition-colors text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...props}
    />
  ),
);
ConditionIconButton.displayName = 'ConditionIconButton';
