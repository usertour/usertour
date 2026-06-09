import { cn } from '@usertour/tailwind';
import { forwardRef } from 'react';

// Trigger button shared by every compact popover-style control —
// ConditionCombobox, ConditionSelect, DateTimePicker, and any future picker
// that lives inside a chip-popover. Owns the chrome (height, border, bg,
// shadow, hover, focus ring, disabled state) so a hover/focus tweak in one
// place propagates everywhere. Consumers pass their own layout className
// (`justify-between` for label+chevron, `gap-2` for icon+label, etc.) and
// children — the wrapper doesn't take a position on what goes inside.
//
// `flex items-center` and `text-foreground` are part of the base because
// every existing consumer uses them; pulling them out would just make
// every call site repeat the same two utilities.
export type CompactPopoverTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const CompactPopoverTrigger = forwardRef<HTMLButtonElement, CompactPopoverTriggerProps>(
  ({ className, type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'flex h-7.5 w-full items-center rounded-lg border border-input bg-surface-raised dark:bg-surface-raised/50 px-3 text-sm text-foreground shadow-none outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
CompactPopoverTrigger.displayName = 'CompactPopoverTrigger';
