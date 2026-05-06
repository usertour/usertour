import {
  DraggableIcon,
  EditIcon,
  RiDeleteBinLine,
  RiMoreFill,
  RiPushpinLine,
} from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import type { CSSProperties, MouseEvent, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactDropdownMenu,
  CompactDropdownMenuContent,
  CompactDropdownMenuItem,
  CompactDropdownMenuTrigger,
  CompactIconButton,
  CompactInput,
} from '@usertour-packages/ui';
import { listRowClass, listRowSelectedClass } from '@usertour-packages/ui';

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
  // Inline rename mode: when true, the label is replaced by an input bound
  // to `renameDraft`. Commit on blur / Enter; cancel on Escape.
  isRenaming?: boolean;
  renameDraft?: string;
  onRenameDraftChange?: (value: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
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
  isRenaming,
  renameDraft,
  onRenameDraftChange,
  onRenameCommit,
  onRenameCancel,
  sortableRef,
  sortableStyle,
  dragHandleProps,
  isDragging,
}: Props) {
  const { t } = useTranslation();
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
          aria-label={t('themeBuilder.aria.dragToReorder')}
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
      {isRenaming ? (
        <div className={cn(listRowClass, selected && listRowSelectedClass, 'pl-5 pr-2')}>
          <CompactInput
            autoFocus
            value={renameDraft ?? ''}
            onChange={(e) => onRenameDraftChange?.(e.target.value)}
            onBlur={() => onRenameCommit?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onRenameCommit?.();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onRenameCancel?.();
              }
            }}
            // Stop drag handle / row click from hijacking pointer/click events
            // while editing the name.
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="h-6 bg-background px-1.5 text-xs"
          />
        </div>
      ) : (
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
      )}
      {hasMenu && !disabled && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=open]:opacity-100">
          <CompactDropdownMenu>
            <CompactDropdownMenuTrigger asChild>
              <CompactIconButton
                size="sm"
                aria-label={t('themeBuilder.aria.variationMenu')}
                onClick={(e) => e.stopPropagation()}
              >
                <RiMoreFill className="h-3.5 w-3.5" />
              </CompactIconButton>
            </CompactDropdownMenuTrigger>
            <CompactDropdownMenuContent
              align="end"
              // Don't snap focus back to the three-dot trigger when the menu
              // closes — the rename input that just mounted is autofocusing,
              // and a focus return would blur it instantly (commit + close).
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {onRename && (
                <CompactDropdownMenuItem onClick={onRename}>
                  <EditIcon className="h-3.5 w-3.5" />
                  {t('themeBuilder.actions.rename')}
                </CompactDropdownMenuItem>
              )}
              {onDelete && (
                <CompactDropdownMenuItem onClick={onDelete} className="text-destructive">
                  <RiDeleteBinLine className="h-3.5 w-3.5" />
                  {t('themeBuilder.actions.delete')}
                </CompactDropdownMenuItem>
              )}
            </CompactDropdownMenuContent>
          </CompactDropdownMenu>
        </div>
      )}
    </div>
  );
}
