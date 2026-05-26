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
import { PlusIcon } from '@usertour/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour/alert-dialog';
import { QuestionTooltip } from '@usertour/tooltip';
import type { RulesCondition, ThemeVariation } from '@usertour/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import { ResizeHandle, bodyClass, headerClass, panelClass, sectionLabelClass } from '@usertour/ui';
import { ConditionsSection } from '../sidebar/conditions-section';
import { VariationRow } from './variation-row';

export interface VariationsSidebarProps {
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

interface SortableVariationRowProps {
  variation: ThemeVariation;
  untitledLabel: string;
  selected: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  isRenaming?: boolean;
  renameDraft?: string;
  onRenameDraftChange?: (value: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
}

// Wires a single variation row into the SortableContext. Kept inline because
// it captures parent props and isn't reused elsewhere.
const SortableVariationRow = (props: SortableVariationRowProps) => {
  const {
    variation,
    untitledLabel,
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
  } = props;
  // Disable drag-and-drop while this row is being renamed so pointer events
  // go to the input rather than the sortable wrapper.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: variation.id,
    disabled: disabled || isRenaming,
  });
  return (
    <VariationRow
      label={variation.name || untitledLabel}
      selected={selected}
      onClick={onClick}
      onRename={onRename}
      onDelete={onDelete}
      disabled={disabled}
      isRenaming={isRenaming}
      renameDraft={renameDraft}
      onRenameDraftChange={onRenameDraftChange}
      onRenameCommit={onRenameCommit}
      onRenameCancel={onRenameCancel}
      sortableRef={setNodeRef}
      sortableStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      dragHandleProps={isRenaming ? undefined : { ...attributes, ...listeners }}
      isDragging={isDragging}
    />
  );
};

export const VariationsSidebar = (props: VariationsSidebarProps) => {
  const {
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
  } = props;
  const { t } = useTranslation();
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

  // The rename menu item already seeds `renameDraft` when the user
  // opens rename (see `onRename` in the sortable row props). A separate
  // effect that re-seeds on every `renamingVariation` reference change
  // would clobber the in-progress draft whenever the variations array
  // gets a fresh reference (parent refetch, sibling rename) — so it's
  // deliberately omitted here.

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameDraft.trim();
    if (trimmed && renamingVariation && trimmed !== renamingVariation.name) {
      onRename(renamingId, trimmed);
    }
    setRenamingId(null);
  };

  return (
    <div className={panelClass} style={{ width }}>
      <div className={`${headerClass} flex items-center justify-between`}>
        <div className={`${sectionLabelClass} flex items-center gap-1.5`}>
          <span>{t('themeBuilder.chrome.variations')}</span>
          <QuestionTooltip>
            {t('themeBuilder.tooltips.variations')
              .split('\n')
              .map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: tooltip body is static
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
          </QuestionTooltip>
        </div>
        <Button
          type="button"
          variant="compact-ghost"
          size="compact-icon"
          onClick={onAdd}
          disabled={disabled}
          aria-label={t('themeBuilder.aria.addVariation')}
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className={bodyClass}>
        <div className="space-y-0.5 p-2">
          <VariationRow
            label={t('themeBuilder.chrome.base')}
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
                  untitledLabel={t('themeBuilder.chrome.untitledVariation')}
                  selected={activeVariationId === variation.id}
                  onClick={() => onSelect(variation.id)}
                  onRename={
                    disabled
                      ? undefined
                      : () => {
                          setRenamingId(variation.id);
                          setRenameDraft(variation.name);
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
                  isRenaming={renamingId === variation.id}
                  renameDraft={renameDraft}
                  onRenameDraftChange={setRenameDraft}
                  onRenameCommit={commitRename}
                  onRenameCancel={() => setRenamingId(null)}
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
              variationName={activeVariation.name}
              onConditionsChange={onConditionsChange}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <AlertDialog
        open={!!deletingVariation}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('themeBuilder.dialogs.deleteVariation.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingVariation
                ? t('themeBuilder.dialogs.deleteVariation.description', {
                    name: deletingVariation.name || t('themeBuilder.chrome.untitledVariation'),
                  })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('themeBuilder.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  onDelete(deletingId);
                  setDeletingId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('themeBuilder.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {resize && (
        <ResizeHandle
          edge="right"
          isAtMin={resize.isAtMin}
          onMouseDown={resize.onMouseDown}
          ariaLabel={t('themeBuilder.aria.resizeSidebar')}
        />
      )}
    </div>
  );
};
