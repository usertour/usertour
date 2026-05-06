import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'outline' | 'secondary' | 'depth';
  size?: 'sm' | 'md';
}

// Layered shadow stack: a 1px outer halo, a 1px bottom edge, and a soft
// 2px-offset blur. Together they make a button look "lifted" without any
// border, distinct from flat outline / ghost buttons.
const DEPTH_SHADOW =
  'shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_1px_0_0_rgba(0,0,0,0.05),0_2px_4px_0_rgba(0,0,0,0.1)]';

export const CompactIconButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'ghost', size = 'md', className, ...props }, ref) => {
    const sizeClass = variant === 'depth' ? 'h-7.5 w-7.5' : size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
    const variantClass =
      variant === 'outline'
        ? 'border border-border/60 bg-background'
        : variant === 'secondary'
          ? 'bg-muted shadow-sm rounded-lg'
          : variant === 'depth'
            ? `bg-background text-foreground rounded-lg hover:bg-muted/40 ${DEPTH_SHADOW}`
            : '';
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
          sizeClass,
          variantClass,
          className,
        )}
        {...props}
      />
    );
  },
);
CompactIconButton.displayName = 'CompactIconButton';
