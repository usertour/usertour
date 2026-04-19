'use client';

import * as React from 'react';
import { Table } from '@tanstack/react-table';
import { Button } from '@usertour-packages/button';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { Input } from '@usertour-packages/input';
import { RiDraggable, RiEyeLine, RiEyeOffLine, RiLayoutColumnLine } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ColumnSetting } from '@usertour/types';
import { DataTableViewOptionsProps } from './types';

// Sentinel item that marks the boundary between shown and hidden columns within the
// single SortableContext. It's a non-draggable, non-droppable "anchor" — items above it
// are shown, items below are hidden.
const DIVIDER_ID = '__column_visibility_divider__';

function getDisplayName(column: {
  id: string;
  columnDef: { meta?: unknown };
}): string {
  const meta = column.columnDef.meta as { displayName?: string } | undefined;
  return meta?.displayName ?? column.id;
}

function collectHideableIds(table: Table<any>): Set<string> {
  return new Set(
    table
      .getAllColumns()
      .filter((c) => typeof c.accessorFn !== 'undefined' && c.getCanHide())
      .map((c) => c.id),
  );
}

interface RowInfo {
  id: string;
  displayName: string;
}

interface SortableRowProps {
  row: RowInfo;
  visible: boolean;
  dragEnabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

const SortableRow = ({ row, visible, dragEnabled, disabled, onToggle }: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !dragEnabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm bg-popover hover:bg-accent',
        isDragging && 'shadow-md ring-1 ring-border',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {dragEnabled ? (
        <span
          className="flex shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <RiDraggable className="h-4 w-4 text-muted-foreground" />
        </span>
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}
      <span
        className="flex-1 truncate cursor-pointer"
        onClick={() => {
          if (!disabled) onToggle();
        }}
      >
        {row.displayName}
      </span>
      <button
        type="button"
        className="shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onToggle();
        }}
        aria-label={visible ? 'Hide column' : 'Show column'}
      >
        {visible ? (
          <RiEyeLine className="h-4 w-4" />
        ) : (
          <RiEyeOffLine className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
};

interface DividerRowProps {
  visible: boolean;
  showBorder: boolean;
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

const DividerRow = ({
  visible,
  showBorder,
  label,
  actionLabel,
  onAction,
  actionDisabled,
}: DividerRowProps) => {
  // Droppable but not draggable. The sentinel must always be mounted (even when
  // collapsed) so it stays in SortableContext and remains a valid drop target for
  // cross-section drags.
  const { setNodeRef, transform, transition } = useSortable({
    id: DIVIDER_ID,
    disabled: { draggable: true },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (!visible) {
    return <div ref={setNodeRef} style={style} aria-hidden className="h-0" />;
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(showBorder && 'mt-2 border-t pt-2')}>
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {actionLabel && onAction && (
          <Button
            type="button"
            variant="ghost"
            className="h-auto px-1.5 py-0.5 text-xs text-primary hover:text-primary"
            onClick={onAction}
            disabled={actionDisabled}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export function DataTableViewOptions<TData>({
  table,
  onColumnsChange,
  disabled = false,
}: DataTableViewOptionsProps<TData>) {
  const [search, setSearch] = React.useState('');
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  const dragEnabled = search.trim() === '' && !disabled;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentOrder = table.getState().columnOrder ?? [];
  const hideableIds = React.useMemo(
    () => collectHideableIds(table),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, currentOrder.join('|')],
  );

  const staticColumnIds = React.useMemo(
    () => currentOrder.filter((id) => !hideableIds.has(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentOrder.join('|'), hideableIds],
  );

  const sortableIds: string[] = React.useMemo(() => {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const id of currentOrder) {
      if (hideableIds.has(id) && !seen.has(id)) {
        result.push(id);
        seen.add(id);
      }
    }
    for (const column of table.getAllColumns()) {
      if (hideableIds.has(column.id) && !seen.has(column.id)) {
        result.push(column.id);
        seen.add(column.id);
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder.join('|'), table, hideableIds]);

  const columnVisibility = table.getState().columnVisibility;
  const visibilityKey = React.useMemo(
    () =>
      Object.entries(columnVisibility)
        .map(([k, v]) => `${k}:${v ? 1 : 0}`)
        .sort()
        .join('|'),
    [columnVisibility],
  );

  const baseItems: string[] = React.useMemo(() => {
    const shown: string[] = [];
    const hidden: string[] = [];
    for (const id of sortableIds) {
      const column = table.getColumn(id);
      if (!column) continue;
      if (column.getIsVisible()) shown.push(id);
      else hidden.push(id);
    }
    return [...shown, DIVIDER_ID, ...hidden];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortableIds, table, visibilityKey]);

  const { shownSlice, hiddenSlice } = React.useMemo(() => {
    const dividerIndex = baseItems.indexOf(DIVIDER_ID);
    if (dividerIndex < 0) return { shownSlice: [] as string[], hiddenSlice: [] as string[] };
    return {
      shownSlice: baseItems.slice(0, dividerIndex),
      hiddenSlice: baseItems.slice(dividerIndex + 1),
    };
  }, [baseItems]);

  const columnLookup = React.useMemo(() => {
    const byId = new Map<string, ReturnType<typeof table.getColumn>>();
    for (const column of table.getAllColumns()) {
      byId.set(column.id, column);
    }
    return byId;
  }, [table]);

  const getRow = React.useCallback(
    (id: string): RowInfo | null => {
      const column = columnLookup.get(id);
      if (!column) return null;
      return { id, displayName: getDisplayName(column) };
    },
    [columnLookup],
  );

  const matchesSearch = React.useCallback(
    (id: string): boolean => {
      const needle = search.trim().toLowerCase();
      if (!needle) return true;
      const row = getRow(id);
      if (!row) return false;
      return (
        row.displayName.toLowerCase().includes(needle) || row.id.toLowerCase().includes(needle)
      );
    },
    [search, getRow],
  );

  const filteredShown = React.useMemo(
    () => shownSlice.filter(matchesSearch),
    [shownSlice, matchesSearch],
  );
  const filteredHidden = React.useMemo(
    () => hiddenSlice.filter(matchesSearch),
    [hiddenSlice, matchesSearch],
  );

  const commit = React.useCallback(
    async (finalItems: string[]) => {
      const dividerIndex = finalItems.indexOf(DIVIDER_ID);
      if (dividerIndex < 0) return;
      const shown = finalItems.slice(0, dividerIndex);
      const hidden = finalItems.slice(dividerIndex + 1);
      const shownSet = new Set(shown);
      for (const id of [...shown, ...hidden]) {
        const column = table.getColumn(id);
        if (!column) continue;
        const shouldBeVisible = shownSet.has(id);
        if (column.getIsVisible() !== shouldBeVisible) {
          column.toggleVisibility(shouldBeVisible);
        }
      }
      table.setColumnOrder([...staticColumnIds, ...shown, ...hidden]);
      if (onColumnsChange) {
        const settings: ColumnSetting[] = [
          ...shown.map((id) => ({ codeName: id, visible: true })),
          ...hidden.map((id) => ({ codeName: id, visible: false })),
        ];
        await onColumnsChange(settings);
      }
    },
    [table, staticColumnIds, onColumnsChange],
  );

  const handleToggle = React.useCallback(
    async (id: string) => {
      if (disabled) return;
      const inShown = shownSlice.includes(id);
      const next = inShown
        ? [...shownSlice.filter((x) => x !== id), DIVIDER_ID, ...hiddenSlice, id]
        : [...shownSlice, id, DIVIDER_ID, ...hiddenSlice.filter((x) => x !== id)];
      await commit(next);
    },
    [disabled, shownSlice, hiddenSlice, commit],
  );

  const handleHideAll = React.useCallback(async () => {
    if (disabled || shownSlice.length === 0) return;
    await commit([DIVIDER_ID, ...hiddenSlice, ...shownSlice]);
  }, [disabled, shownSlice, hiddenSlice, commit]);

  const handleShowAll = React.useCallback(async () => {
    if (disabled || hiddenSlice.length === 0) return;
    await commit([...shownSlice, ...hiddenSlice, DIVIDER_ID]);
  }, [disabled, shownSlice, hiddenSlice, commit]);

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;
      if (active.id === DIVIDER_ID) return;

      const oldIndex = baseItems.indexOf(String(active.id));
      if (oldIndex < 0) return;

      // Plain arrayMove(items, oldIndex, newIndex) — matches verticalListSortingStrategy's
      // animation semantics, so the final position always equals what the user saw while
      // dragging. Cross-section drops aim at the DIVIDER sentinel; everything else aims at
      // the over item.
      const newIndex =
        over.id === DIVIDER_ID ? baseItems.indexOf(DIVIDER_ID) : baseItems.indexOf(String(over.id));
      if (newIndex < 0) return;

      const final = arrayMove(baseItems, oldIndex, newIndex);
      if (!final.includes(DIVIDER_ID)) return;
      await commit(final);
    },
    [baseItems, commit],
  );

  const handleDragCancel = React.useCallback(() => setActiveId(null), []);

  const isDragging = activeId !== null;
  const nothingMatches = filteredShown.length === 0 && filteredHidden.length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
          disabled={disabled}
        >
          <RiLayoutColumnLine className="mr-2 h-4 w-4" />
          Customize Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        onInteractOutside={(e) => {
          if (isDragging) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isDragging) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        <div className="flex flex-col">
          <div className="p-2">
            <Input
              placeholder="Search columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {nothingMatches && search ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No columns found.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext items={baseItems} strategy={verticalListSortingStrategy}>
                  {shownSlice.length > 0 && (
                    <div className="px-2 py-2">
                      <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Shown in table
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto px-1.5 py-0.5 text-xs text-primary hover:text-primary"
                          onClick={handleHideAll}
                          disabled={!dragEnabled}
                        >
                          Hide all
                        </Button>
                      </div>
                      {filteredShown.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground italic">
                          No matches
                        </div>
                      ) : (
                        filteredShown.map((id) => {
                          const row = getRow(id);
                          if (!row) return null;
                          return (
                            <SortableRow
                              key={id}
                              row={row}
                              visible
                              dragEnabled={dragEnabled}
                              disabled={disabled}
                              onToggle={() => handleToggle(id)}
                            />
                          );
                        })
                      )}
                    </div>
                  )}

                  <DividerRow
                    visible={hiddenSlice.length > 0}
                    showBorder={shownSlice.length > 0}
                    label="Hidden in table"
                    actionLabel="Show all"
                    onAction={handleShowAll}
                    actionDisabled={!dragEnabled}
                  />

                  {hiddenSlice.length > 0 && (
                    <div className="px-2 pb-2">
                      {filteredHidden.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground italic">
                          No matches
                        </div>
                      ) : (
                        filteredHidden.map((id) => {
                          const row = getRow(id);
                          if (!row) return null;
                          return (
                            <SortableRow
                              key={id}
                              row={row}
                              visible={false}
                              dragEnabled={dragEnabled}
                              disabled={disabled}
                              onToggle={() => handleToggle(id)}
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
