import {
  DraggableIcon,
  EditIcon,
  RiDeleteBinLine,
  RiMoreFill,
  RiPushpinLine,
} from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import type { CSSProperties, MouseEvent, Ref } from 'react';
import {
  BuilderDropdownMenu,
  BuilderDropdownMenuContent,
  BuilderDropdownMenuItem,
  BuilderDropdownMenuTrigger,
  BuilderIconButton,
} from '../ui';
import { listRowClass, listRowSelectedClass } from '../ui/tokens';

// Props passed by `useSortable` and forwarded to the drag handle. Marked as
// optional so the Base row (non-draggable) can reuse the component without
// a sortable context.
type DragHandleProps = Record<string, unknown> & {
  onMouseDown?: (event: MouseEvent) => void;
};

interface Props {
  label: string;
  selected: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  // Sortable wiring — set when the row participates in a SortableContext.
  sortableRef?: Ref<HTMLDivElement>;
  sortableStyle?: CSSProperties;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

export function VariationRow({
  label,
  selected,
  onClick,
  onRename,
  onDelete,
  disabled,
  sortableRef,
  sortableStyle,
  dragHandleProps,
  isDragging,
}: Props) {
  const hasMenu = !!(onRename || onDelete);
  const draggable = !!dragHandleProps && !disabled;

  return (
    <div
      ref={sortableRef}
      style={sortableStyle}
      className={cn('group/row relative flex items-center', isDragging && 'opacity-50')}
    >
      {/* Left affordance:
          - draggable rows → grab handle (interactive)
          - non-draggable Base → pushpin (passive, communicates "pinned, can't
            move"). Both occupy the same slot so content stays aligned. */}
      {draggable ? (
        <button
          type="button"
          aria-label="Drag to reorder"
          className="absolute left-0.5 top-1/2 flex h-5 w-4 -translate-y-1/2 cursor-grab items-center justify-center text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
        >
          <DraggableIcon className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-1/2 flex h-5 w-4 -translate-y-1/2 items-center justify-center text-muted-foreground/60"
        >
          <RiPushpinLine className="h-3.5 w-3.5" />
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          listRowClass,
          selected && listRowSelectedClass,
          // pl-5 always — keeps Base aligned with variations.
          'pl-5',
          hasMenu && 'pr-7',
        )}
      >
        <span className="flex-1 truncate text-left">{label}</span>
      </button>
      {hasMenu && !disabled && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=open]:opacity-100">
          <BuilderDropdownMenu>
            <BuilderDropdownMenuTrigger asChild>
              <BuilderIconButton
                size="sm"
                aria-label="Variation menu"
                onClick={(e) => e.stopPropagation()}
              >
                <RiMoreFill className="h-3.5 w-3.5" />
              </BuilderIconButton>
            </BuilderDropdownMenuTrigger>
            <BuilderDropdownMenuContent align="end">
              {onRename && (
                <BuilderDropdownMenuItem onClick={onRename}>
                  <EditIcon className="h-3.5 w-3.5" />
                  Rename
                </BuilderDropdownMenuItem>
              )}
              {onDelete && (
                <BuilderDropdownMenuItem onClick={onDelete} className="text-destructive">
                  <RiDeleteBinLine className="h-3.5 w-3.5" />
                  Delete
                </BuilderDropdownMenuItem>
              )}
            </BuilderDropdownMenuContent>
          </BuilderDropdownMenu>
        </div>
      )}
    </div>
  );
}
