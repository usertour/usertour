import { cn } from '@usertour-packages/tailwind';

interface Props {
  // Which edge of the parent panel this handle sits on.
  edge: 'left' | 'right';
  // True when the panel is clamped at its minimum width — used only to swap
  // the cursor to a single-direction resize so the user knows which way the
  // panel can grow.
  isAtMin?: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
  // Accessible label for the handle. The component is i18n-agnostic; the
  // consumer passes the localized string. Defaults to English so a missing
  // label doesn't crash usage in greenfield contexts.
  ariaLabel?: string;
}

// 6px invisible hit area straddling the panel's inner edge. The drag
// affordance is purely the cursor change — no visible line or icon.
export function ResizeHandle({ edge, isAtMin, onMouseDown, ariaLabel = 'Resize panel' }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onMouseDown={onMouseDown}
      className={cn(
        'absolute top-0 z-10 h-full w-1.5 cursor-col-resize bg-transparent',
        edge === 'right' ? '-right-1' : '-left-1',
        isAtMin && (edge === 'right' ? 'cursor-e-resize' : 'cursor-w-resize'),
      )}
    />
  );
}
