import { RiArrowLeftSLine, RiArrowRightSLine } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';

interface Props {
  // Which edge of the sidebar this handle sits on.
  edge: 'left' | 'right';
  isResizing: boolean;
  // When true, the panel is at its minimum width — render a chevron pointing
  // in the direction the user can drag to expand instead of the resize line.
  isAtMin?: boolean;
  onMouseDown: (event: React.MouseEvent) => void;
}

// Thin (1px) visible divider with a wider (6px) invisible hit area so the
// drag affordance feels firm without the divider visually thickening. At min
// width the handle swaps to a chevron pointing toward the only direction the
// user can drag to grow the panel.
export function SidebarResizeHandle({ edge, isResizing, isAtMin, onMouseDown }: Props) {
  // When at min, the only direction the user can drag is away from the
  // sibling edge: handle on right edge (left panel) → drag right → ChevronRight;
  // handle on left edge (right panel) → drag left → ChevronLeft.
  const ChevronIcon = edge === 'right' ? RiArrowRightSLine : RiArrowLeftSLine;

  return (
    <button
      type="button"
      aria-label="Resize sidebar"
      onMouseDown={onMouseDown}
      className={cn(
        'group absolute top-0 z-10 h-full w-1.5 cursor-col-resize bg-transparent',
        edge === 'right' ? '-right-1' : '-left-1',
        isAtMin && (edge === 'right' ? 'cursor-e-resize' : 'cursor-w-resize'),
      )}
    >
      {isAtMin ? (
        <span
          className={cn(
            'absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-sm transition-colors group-hover:bg-primary/15 group-hover:text-primary',
            edge === 'right' ? 'right-1 translate-x-1/2' : 'left-1 -translate-x-1/2',
            isResizing && 'bg-primary/20 text-primary',
          )}
        >
          <ChevronIcon className="h-3 w-3" />
        </span>
      ) : (
        <span
          className={cn(
            'absolute top-0 h-full w-px transition-colors',
            edge === 'right' ? 'right-1' : 'left-1',
            isResizing ? 'bg-primary/60' : 'bg-transparent group-hover:bg-primary/40',
          )}
        />
      )}
    </button>
  );
}
