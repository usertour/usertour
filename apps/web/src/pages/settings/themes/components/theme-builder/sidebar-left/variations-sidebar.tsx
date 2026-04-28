import {
  DndContext,
  type DragEndEvent,
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
import { PlusIcon } from '@usertour-packages/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import type { RulesCondition, ThemeVariation } from '@usertour/types';
import { useEffect, useState } from 'react';
import { ConditionsSection } from '../sidebar/conditions-section';
import { SidebarResizeHandle } from '../sidebar/sidebar-resize-handle';
import { BuilderIconButton, BuilderInput } from '../ui';
import {
  sectionLabelClass,
  sidebarBodyClass,
  sidebarHeaderClass,
  sidebarPanelClass,
} from '../ui/tokens';
import { VariationRow } from './variation-row';

interface Props {
  variations: ThemeVariation[];
  activeVariationId: string | null;
  activeVariation: ThemeVariation | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onConditionsChange: (conditions: RulesCondition[]) => void;
  // Reorder by id list — VariationsSidebar resolves ids to indices.
  onReorder: (fromIndex: number, toIndex: number) => void;
  disabled?: boolean;
  width: number;
  resize?: {
    isAtMin: boolean;
    onMouseDown: (event: React.MouseEvent) => void;
  };
}

// Wires a single variation row into the SortableContext. Kept inline because
// it captures parent props and isn't reused elsewhere.
function SortableVariationRow({
  variation,
  selected,
  onClick,
  onRename,
  onDelete,
  disabled,
}: {
  variation: ThemeVariation;
  selected: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: variation.id,
    disabled,
  });
  return (
    <VariationRow
      label={variation.name || 'Untitled variation'}
      selected={selected}
      onClick={onClick}
      onRename={onRename}
      onDelete={onDelete}
      disabled={disabled}
      sortableRef={setNodeRef}
      sortableStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
    />
  );
}

const BASE_LABEL = 'Base';

export function VariationsSidebar({
  variations,
  activeVariationId,
  activeVariation,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onConditionsChange,
  onReorder,
  disabled,
  width,
  resize,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // PointerSensor with a small distance threshold so a click doesn't get
  // hijacked as a drag (we want clicks on the handle to be clearly drags only
  // when the user moves a few pixels).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = variations.findIndex((v) => v.id === active.id);
    const toIndex = variations.findIndex((v) => v.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(fromIndex, toIndex);
  };

  const renamingVariation = renamingId
    ? (variations.find((v) => v.id === renamingId) ?? null)
    : null;
  const deletingVariation = deletingId
    ? (variations.find((v) => v.id === deletingId) ?? null)
    : null;

  useEffect(() => {
    if (renamingVariation) setRenameDraft(renamingVariation.name);
  }, [renamingVariation]);

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed && renamingVariation && trimmed !== renamingVariation.name) {
      onRename(renamingId, trimmed);
    }
    setRenamingId(null);
  };

  return (
    <div className={sidebarPanelClass} style={{ width }}>
      <div className={`${sidebarHeaderClass} flex items-center justify-between`}>
        <div className={sectionLabelClass}>Variations</div>
        <BuilderIconButton onClick={onAdd} disabled={disabled} aria-label="Add variation">
          <PlusIcon className="h-3.5 w-3.5" />
        </BuilderIconButton>
      </div>

      <div className={sidebarBodyClass}>
        <div className="space-y-0.5 p-2">
          <VariationRow
            label={BASE_LABEL}
            selected={activeVariationId === null}
            onClick={() => onSelect(null)}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={variations.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
              disabled={disabled}
            >
              {variations.map((variation) => (
                <SortableVariationRow
                  key={variation.id}
                  variation={variation}
                  selected={activeVariationId === variation.id}
                  onClick={() => onSelect(variation.id)}
                  onRename={
                    disabled
                      ? undefined
                      : () => {
                          setRenamingId(variation.id);
                        }
                  }
                  onDelete={
                    disabled
                      ? undefined
                      : () => {
                          setDeletingId(variation.id);
                        }
                  }
                  disabled={disabled}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Conditions for the active variation. Inline below the list (not
            pinned to the bottom) so an empty panel doesn't get a midline gap.
            Hidden when Base is selected — Base has no conditions. */}
        {activeVariation && (
          <div className="border-t border-border/50">
            {/* `key` forces ConditionsSection (and the underlying Rules
                component, whose `defaultConditions` is uncontrolled) to
                remount when the user switches variation, so the rules editor
                shows the conditions of the newly selected variation. */}
            <ConditionsSection
              key={activeVariation.id}
              conditions={activeVariation.conditions}
              onConditionsChange={onConditionsChange}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Rename popover, anchored to the sidebar (simpler than per-row anchors) */}
      <Popover
        open={!!renamingVariation}
        onOpenChange={(open) => {
          if (!open) commitRename();
        }}
      >
        <PopoverTrigger asChild>
          <span className="absolute left-[100px] top-[60px]" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-64 p-3"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="grid grid-cols-[60px_1fr] items-center gap-x-3 gap-y-2">
            <label
              htmlFor="variation-rename-input"
              className="text-[11px] font-medium text-muted-foreground"
            >
              Name
            </label>
            <BuilderInput
              id="variation-rename-input"
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === 'Escape') {
                  setRenamingId(null);
                }
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={!!deletingVariation}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variation</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingVariation
                ? `Delete "${deletingVariation.name || 'Untitled'}"? This can be undone before saving.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  onDelete(deletingId);
                  setDeletingId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {resize && (
        <SidebarResizeHandle
          edge="right"
          isAtMin={resize.isAtMin}
          onMouseDown={resize.onMouseDown}
        />
      )}
    </div>
  );
}
