import { cn } from '@usertour/tailwind';
import type { ComponentPropsWithoutRef } from 'react';

export interface SurfaceCardProps extends ComponentPropsWithoutRef<'div'> {
  /** Layout-only classes on top of the surface (gap, direction, margins, `relative`). */
  className?: string;
}

// The recessed "surface card" that groups settings rows in the builder. In
// dark it sits one step below the panel (`surface/50`) so the translucent
// controls inside it float clearly — see docs/conventions/dark-layering.md.
// Owns only the surface + radius + padding, so that shade lives in ONE place;
// layout (gap, direction, margins) and any div props (onClick, …) pass through.
export const SurfaceCard = (props: SurfaceCardProps) => {
  const { className, children, ...rest } = props;
  return (
    <div className={cn('rounded-lg bg-surface dark:bg-surface/50 p-3.5', className)} {...rest}>
      {children}
    </div>
  );
};
SurfaceCard.displayName = 'SurfaceCard';
