import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'outline';
  size?: 'sm' | 'md';
}

export const BuilderIconButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'ghost', size = 'md', className, ...props }, ref) => {
    const sizeClass = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
          sizeClass,
          variant === 'outline' && 'border border-border/60 bg-background',
          className,
        )}
        {...props}
      />
    );
  },
);
BuilderIconButton.displayName = 'BuilderIconButton';
