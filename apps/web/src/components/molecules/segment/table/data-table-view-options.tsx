'use client';

import * as React from 'react';
import { Table } from '@tanstack/react-table';
import { Button } from '@usertour-packages/button';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@usertour-packages/command';
import { RiDraggable, RiEyeLine, RiEyeOffLine, RiLayoutColumnLine } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
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

function buildColumnSettings(
  table: Table<any>,
  orderedIds: string[],
  override?: { id: string; visible: boolean },
): ColumnSetting[] {
  const hideableIds = collectHideableIds(table);
  const settings: ColumnSetting[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    if (!hideableIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    const column = table.getColumn(id);
    if (!column) continue;
    const visible = override && override.id === id ? override.visible : column.getIsVisible();
    settings.push({ codeName: id, visible });
  }
  for (const column of table.getAllColumns()) {
    if (hideableIds.has(column.id) && !seen.has(column.id)) {
      seen.add(column.id);
      const visible =
        override && override.id === column.id ? override.visible : column.getIsVisible();
      settings.push({ codeName: column.id, visible });
    }
  }
  return settings;
}

interface SortableColumnRowProps {
  id: string;
  displayName: string;
  visible: boolean;
  dragEnabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

const SortableColumnRow = ({
  id,
  displayName,
  visible,
  dragEnabled,
  disabled,
  onToggle,
}: SortableColumnRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <CommandItem
      ref={setNodeRef}
      style={style}
      value={id}
      onSelect={() => {
        if (!disabled) onToggle();
      }}
      className={cn(
        'flex items-center gap-2 cursor-pointer',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {dragEnabled ? (
        <span
          className="flex shrink-0 cursor-grab"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <RiDraggable className="h-4 w-4 text-muted-foreground" />
        </span>
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1 truncate text-sm">{displayName}</span>
      {visible ? (
        <RiEyeLine className="h-4 w-4 shrink-0" />
      ) : (
        <RiEyeOffLine className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </CommandItem>
  );
};

export function DataTableViewOptions<TData>({
  table,
  onColumnsChange,
  disabled = false,
}: DataTableViewOptionsProps<TData>) {
  const [search, setSearch] = React.useState('');
  const dragEnabled = search.trim() === '';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentOrder = table.getState().columnOrder ?? [];
  const hideableIds = collectHideableIds(table);

  // Build sortable id list in tanstack order, filtered to hideable; unknown hideable cols appended.
  const sortableIds: string[] = [];
  const seenSortable = new Set<string>();
  for (const id of currentOrder) {
    if (hideableIds.has(id) && !seenSortable.has(id)) {
      sortableIds.push(id);
      seenSortable.add(id);
    }
  }
  for (const column of table.getAllColumns()) {
    if (hideableIds.has(column.id) && !seenSortable.has(column.id)) {
      sortableIds.push(column.id);
      seenSortable.add(column.id);
    }
  }

  const handleToggle = React.useCallback(
    async (id: string) => {
      if (disabled) return;
      const column = table.getColumn(id);
      if (!column) return;
      const nextVisible = !column.getIsVisible();
      column.toggleVisibility(nextVisible);
      if (onColumnsChange) {
        const latestOrder = table.getState().columnOrder ?? [];
        await onColumnsChange(
          buildColumnSettings(table, latestOrder, { id, visible: nextVisible }),
        );
      }
    },
    [table, onColumnsChange, disabled],
  );

  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = sortableIds.indexOf(active.id as string);
      const newIndex = sortableIds.indexOf(over.id as string);
      if (oldIndex < 0 || newIndex < 0) return;

      const nextSortable = arrayMove(sortableIds, oldIndex, newIndex);
      const staticIds = currentOrder.filter((id) => !hideableIds.has(id));
      const nextFullOrder = [...staticIds, ...nextSortable];

      table.setColumnOrder(nextFullOrder);
      if (onColumnsChange) {
        await onColumnsChange(buildColumnSettings(table, nextFullOrder));
      }
    },
    [sortableIds, currentOrder, hideableIds, table, onColumnsChange],
  );

  const commandFilter = React.useCallback(
    (value: string, q: string) => {
      const column = table.getColumn(value);
      if (!column) return 0;
      const needle = q.toLowerCase();
      const displayName = getDisplayName(column).toLowerCase();
      const codeName = column.id.toLowerCase();
      return displayName.includes(needle) || codeName.includes(needle) ? 1 : 0;
    },
    [table],
  );

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
      <PopoverContent align="end" className="w-72 p-0">
        <Command filter={commandFilter}>
          <CommandInput placeholder="Search columns..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {sortableIds.map((id) => {
                    const column = table.getColumn(id);
                    if (!column) return null;
                    return (
                      <SortableColumnRow
                        key={id}
                        id={id}
                        displayName={getDisplayName(column)}
                        visible={column.getIsVisible()}
                        dragEnabled={dragEnabled}
                        disabled={disabled}
                        onToggle={() => handleToggle(id)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
