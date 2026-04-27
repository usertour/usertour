import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

const isHexColor = (s: string): boolean => /^#?[0-9a-fA-F]{6}$|^#?[0-9a-fA-F]{8}$/.test(s);
const stripHash = (s: string): string => (s.startsWith('#') ? s.slice(1) : s);

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  color: string;
}

// Framer-style swatch + hex code trigger button. Used as a popover trigger
// inside ColorField (which owns the popover and color picker panel).
export const BuilderColorButton = forwardRef<HTMLButtonElement, Props>(
  ({ color, className, ...props }, ref) => {
    const isAuto = color === 'Auto';
    const swatchColor = isAuto || !isHexColor(color) ? '#ffffff' : color;
    const display = isAuto ? 'Auto' : isHexColor(color) ? stripHash(color).toUpperCase() : color;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex h-7.5 w-full items-center gap-2 rounded-lg bg-muted pl-1 pr-2 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
          className,
        )}
        {...props}
      >
        <span
          className="block h-5.5 w-5.5 shrink-0 rounded ring-1 ring-inset ring-border/40"
          style={{ backgroundColor: swatchColor }}
          aria-hidden
        />
        <span className="flex-1 truncate text-left font-mono text-[11px] font-medium text-foreground/80">
          {display}
        </span>
      </button>
    );
  },
);
BuilderColorButton.displayName = 'BuilderColorButton';
