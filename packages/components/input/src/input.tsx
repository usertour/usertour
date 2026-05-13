import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@usertour/tailwind';

// `variant` collapses both the size and surface decisions into one knob — we
// avoid splitting it into separate `size`/`surface` props because `<input>`
// already takes a native `size` attribute (number of visible characters), and
// shadowing that breaks consumers that rely on it (e.g. inline-edit titles
// that auto-size to content length).
//
// All variants share the same focus / file / aria / disabled treatments —
// only height / radius / surface / text scale differ between them. Don't
// move shared classes into the cva base; cva's `cx()` strips per-variant
// duplicates only when they're literally identical, and tailwind-merge
// later collapses what's left, so keeping the full string per variant
// stays predictable.
// File-picker button sizing (file:h-7 file:text-sm) lives in the base so
// every variant — default, compact, compact-muted — gets the same file
// picker treatment. The previous wrappers (CompactInput, ConditionInput)
// inherited these from base shadcn, so keeping them shared preserves their
// rendering exactly.
const inputVariants = cva(
  'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 w-full min-w-0 transition-[color,box-shadow] outline-none file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        // Default — shadcn baseline. 36px, base text, bordered transparent.
        default:
          'h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs md:text-sm',
        // Compact bordered — 30px / 12px / soft border on white. Used in
        // chip-popover form fields and other dense bordered contexts.
        compact:
          'h-7.5 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm md:text-sm',
        // Compact muted — 30px / 14px / bg-muted with the same soft border
        // as bordered (kept so muted+bordered ≈ visual rendering of the
        // legacy CompactInput, which was muted-on-bordered-base by way of
        // class inheritance). Used in dense settings / inspector panels.
        'compact-muted':
          'h-7.5 rounded-lg border border-input bg-muted px-3 py-1 text-sm shadow-sm md:text-sm',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

const OutlineInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-9 w-full min-w-0 bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:outline-none',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          'bg-transparent border-transparent focus:border-input border-b',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
OutlineInput.displayName = 'OutlineInput';

export { Input, OutlineInput, inputVariants };
