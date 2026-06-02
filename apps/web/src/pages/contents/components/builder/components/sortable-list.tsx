import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DraggableAttributes,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

// Synthetic listeners returned by useSortable; the type is not exported from the
// package root, so derive it from the hook's return value to stay precise.
type SortableListeners = ReturnType<typeof useSortable>['listeners'];

export interface SortableRowProps {
  setNodeRef: (node: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: SortableListeners;
  style: React.CSSProperties;
  isDragging: boolean;
}

export interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderRow: (item: T, sortable: SortableRowProps) => React.ReactNode;
  renderOverlay: (item: T) => React.ReactNode;
}

interface SortableRowRendererProps<T> {
  item: T;
  id: string;
  renderRow: (item: T, sortable: SortableRowProps) => React.ReactNode;
}

function SortableRow<T>(props: SortableRowRendererProps<T>) {
  const { item, id, renderRow } = props;
  const { attributes, listeners, isDragging, setNodeRef, transform, transition } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return <>{renderRow(item, { setNodeRef, attributes, listeners, style, isDragging })}</>;
}

export function SortableList<T>(props: SortableListProps<T>) {
  const { items, getId, onReorder, renderRow, renderOverlay } = props;
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (active && over && active.id !== over.id) {
      const fromIndex = items.findIndex((item) => getId(item) === active.id);
      const toIndex = items.findIndex((item) => getId(item) === over.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        onReorder(fromIndex, toIndex);
      }
    }
    setActiveId(null);
  };

  const activeItem = activeId ? items.find((item) => getId(item) === activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(getId)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableRow key={getId(item)} id={getId(item)} item={item} renderRow={renderRow} />
        ))}
      </SortableContext>
      <DragOverlay>{activeItem ? renderOverlay(activeItem) : null}</DragOverlay>
    </DndContext>
  );
}

SortableList.displayName = 'SortableList';
