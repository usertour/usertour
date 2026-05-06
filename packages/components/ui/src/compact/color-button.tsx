import { cn } from '@usertour-packages/tailwind';
import { forwardRef } from 'react';

const isHexColor = (s: string): boolean => /^#?[0-9a-fA-F]{6}$|^#?[0-9a-fA-F]{8}$/.test(s);
const stripHash = (s: string): string => (s.startsWith('#') ? s.slice(1) : s);

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  // The hex color to render in the swatch. When `isAuto` is set, this should
  // be the resolved fallback hex (the swatch shows the resolved color while
  // the label still reads "Auto").
  color: string;
  isAuto?: boolean;
}

// Swatch + label trigger button. Typically used as a popover trigger inside
// a color field that owns the popover and color picker panel.
export const CompactColorButton = forwardRef<HTMLButtonElement, Props>(
  ({ color, isAuto = false, className, ...props }, ref) => {
    const swatchColor = isHexColor(color) ? color : '#ffffff';
    const display = isAuto ? 'Auto' : isHexColor(color) ? stripHash(color).toUpperCase() : color;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          // Focus ring matches the rest of the compact form-trigger family
          // (Input / SelectTrigger / Button / FontPicker) — 3px ring +
          // border-ring + ring/50. Keyboard tabbing through dense form
          // panels lands one consistent focus affordance.
          'flex h-7.5 w-full items-center gap-2 rounded-lg bg-muted pl-1 pr-2 outline-none transition-colors hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
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
CompactColorButton.displayName = 'CompactColorButton';
