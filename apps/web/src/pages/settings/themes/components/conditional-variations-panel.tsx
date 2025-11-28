import { Attribute, ThemeVariation } from '@usertour/types';
import { Button } from '@usertour-packages/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { SubThemeModal } from './sub-theme-modal';
import { QuestionTooltip } from '@usertour-packages/tooltip';
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
import { DragHandleDots2Icon } from '@radix-ui/react-icons';

interface ConditionalVariationsPanelProps {
  isViewOnly?: boolean;
  variations: ThemeVariation[];
  onVariationsChange?: (variations: ThemeVariation[]) => void;
  attributeList?: Attribute[];
}

// Sortable variation item component
const SortableVariationItem = ({
  variation,
  index,
  onClick,
}: {
  variation: ThemeVariation;
  index: number;
  onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: index.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      <Button
        variant="outline"
        className="flex items-center gap-2 w-full justify-start h-auto px-1 py-2 border-none hover:text-primary hover:bg-accent/50"
        onClick={onClick}
      >
        <DragHandleDots2Icon className="h-4 w-4 cursor-move" {...attributes} {...listeners} />
        <span className="text-sm font-medium">{variation.name || `Variation ${index + 1}`}</span>
      </Button>
    </div>
  );
};

export const ConditionalVariationsPanel = ({
  isViewOnly = false,
  variations,
  onVariationsChange,
  attributeList,
}: ConditionalVariationsPanelProps) => {
  const [openModal, setOpenModal] = useState(false);
  const [editingVariation, setEditingVariation] = useState<ThemeVariation | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddVariation = () => {
    setEditingVariation(null);
    setEditingIndex(-1);
    setOpenModal(true);
  };

  const handleEditVariation = (variation: ThemeVariation, index: number) => {
    setEditingVariation(variation);
    setEditingIndex(index);
    setOpenModal(true);
  };

  const handleSaveVariation = (variation: ThemeVariation) => {
    if (onVariationsChange) {
      const newVariations = [...variations];
      if (editingIndex >= 0) {
        // Edit existing variation
        newVariations[editingIndex] = variation;
      } else {
        // Add new variation
        newVariations.push(variation);
      }
      onVariationsChange(newVariations);
    }
    setOpenModal(false);
    setEditingVariation(null);
    setEditingIndex(-1);
  };

  const handleDeleteVariation = () => {
    if (onVariationsChange && editingIndex >= 0) {
      const newVariations = variations.filter((_, index) => index !== editingIndex);
      onVariationsChange(newVariations);
    }
    setOpenModal(false);
    setEditingVariation(null);
    setEditingIndex(-1);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = Number.parseInt(active.id as string, 10);
      const newIndex = Number.parseInt(over?.id as string, 10);

      if (onVariationsChange) {
        const newVariations = arrayMove(variations, oldIndex, newIndex);
        onVariationsChange(newVariations);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Conditional variations</span>
          <QuestionTooltip>
            Create theme variations that automatically apply based on user attributes. All matching
            variations will be applied in the order shown below. <br />
            Examples:
            <br />• Apply dark theme when user has dark mode enabled
            <br />• Use premium colors for paid users
          </QuestionTooltip>
        </div>

        {variations.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={variations.map((_, index) => index.toString())}
              strategy={verticalListSortingStrategy}
              disabled={isViewOnly}
            >
              <div className="space-y-1">
                {variations.map((variation, index) => (
                  <SortableVariationItem
                    key={variation.id || index}
                    variation={variation}
                    index={index}
                    onClick={() => handleEditVariation(variation, index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <Button
          variant="link"
          size="sm"
          onClick={handleAddVariation}
          disabled={isViewOnly}
          className="gap-2 hover:no-underline w-fit p-0"
        >
          <PlusIcon className="h-4 w-4" />
          Add Conditional Variation
        </Button>
      </div>

      {openModal && (
        <SubThemeModal
          isOpen={openModal}
          isViewOnly={isViewOnly}
          onOpenChange={setOpenModal}
          initialVariation={editingVariation}
          onSave={handleSaveVariation}
          onDelete={handleDeleteVariation}
          attributeList={attributeList}
        />
      )}
    </div>
  );
};
