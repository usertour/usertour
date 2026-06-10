import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@usertour/tailwind';

// Hero icon-button "depth" surface — bg-background lifted by a layered
// triple shadow (1px halo + 1px bottom edge + 2px blur). Used in compact
// chrome (back arrow, etc.) where the button must read as "primary action"
// against bg-muted neighbors without resorting to color contrast.
const DEPTH_SHADOW =
  'shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_1px_0_0_rgba(0,0,0,0.05),0_2px_4px_0_rgba(0,0,0,0.1)]';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
        outline:
          'border border-input bg-background dark:bg-surface-raised/50 hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Compact-family surfaces ---------------------------------------
        // Used in dense chrome (settings panels, chip popovers, top bars).
        // Distinct from outline / secondary / ghost (which target Card /
        // page-level chrome). All three compact-* surfaces share a muted
        // resting tone + muted hover bg + foreground hover text — the legacy
        // CompactIconButton baked these into its base, so every variant
        // (ghost / outline / secondary) inherited them. We keep that
        // consistency by repeating the trio across compact-ghost /
        // compact-outline / compact-secondary. Each variant owns its
        // radius (rounded for ghost/outline, rounded-lg for secondary/
        // depth); size variants do NOT set rounded so a variant×size pair
        // never produces conflicting radii.
        'compact-ghost':
          'rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
        'compact-outline':
          'rounded border border-border/60 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
        'compact-secondary':
          'rounded-lg bg-muted shadow-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
        depth: `rounded-lg bg-background text-foreground hover:bg-muted/40 ${DEPTH_SHADOW}`,
      },
      size: {
        default: 'h-8 px-4 py-2',
        sm: 'h-7 rounded-md px-3',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-8 w-8',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
        // Compact text button (30px tall, 12px text) — chip / inspector
        // primary action paired with compact inputs.
        compact: 'h-7.5 px-3 text-sm shadow-sm',
        // Smaller compact text button (24px tall, 12px text) — used inside
        // chip-popover editors for tag-like inline buttons (e.g. CSS
        // selector candidates).
        'compact-sm': 'h-6 px-2 text-sm shadow-sm',
        // Compact icon-only buttons. Three sizes line up with the
        // CompactIconButton family that previously lived in
        // @usertour/ui:
        //   compact-icon-sm  → 24px (chip remove, three-dot menu trigger)
        //   compact-icon     → 28px (general icon button)
        //   compact-icon-lg  → 30px (hero back-button, paired with depth)
        'compact-icon-sm': 'size-6',
        'compact-icon': 'size-7',
        'compact-icon-lg': 'size-7.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
