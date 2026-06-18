import type { DraggableAttributes, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import {
  Delete2Icon,
  EventIcon2,
  RiAlertLine,
  RiChat2Line,
  RiDraggable,
  RiEyeOffLine,
  RiMessage2Line,
  RiWindow2Line,
} from '@usertour/icons';
import { Step, StepContentType } from '@usertour/types';
import type { ComponentType } from 'react';
import { forwardRef, memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { getStepId } from '@/utils/content';
import { useFlowEditor } from '@/pages/contents/components/builder/flow/use-flow-editor';
import { stepIsReachable } from '@/pages/contents/components/builder/utils/content-validate';

// Per step-type row glyph, shown left of the step name.
const STEP_TYPE_ICON: Partial<Record<StepContentType, ComponentType<{ className?: string }>>> = {
  [StepContentType.TOOLTIP]: RiChat2Line,
  [StepContentType.MODAL]: RiWindow2Line,
  [StepContentType.HIDDEN]: RiEyeOffLine,
  [StepContentType.BUBBLE]: RiMessage2Line,
};

// Type definitions for SidebarContent props
interface SidebarContentProps {
  index: number;
  step: Step;
  onClick?: (action: string, index: number) => void;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
  isReachable?: boolean;
  style?: React.CSSProperties;
}

// Type definitions for SortableItem props
interface SortableItemProps {
  id: string;
  index: number;
  step: Step;
  onClick: (action: string, index: number) => void;
  isReachable: boolean;
}

const SidebarContent = memo(
  forwardRef<HTMLDivElement, SidebarContentProps>(
    (
      { index, step, onClick, listeners = {}, attributes = {}, isReachable = true, ...props },
      ref,
    ) => {
      const { t } = useTranslation();
      // Clicking the row opens the step for editing (and the canvas previews
      // it). There is no separate select-without-edit affordance.
      //
      // The delete confirmation is an AlertDialog that Radix portals out of
      // this row's DOM subtree. Its synthetic click events (Cancel / Delete /
      // the dimmed overlay) still bubble up the *React* tree to this row-level
      // handler, which would wrongly open the step — e.g. clicking Cancel would
      // land the user in the step detail. Only treat a click as a row click
      // when its real DOM target lives inside the row.
      const handleEdit = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
          if (!event.currentTarget.contains(event.target as Node)) {
            return;
          }
          onClick?.('edit', index);
        },
        [onClick, index],
      );

      const handleEditTrigger = useCallback(() => {
        onClick?.('trigger', index);
      }, [onClick, index]);

      const handleDelete = useCallback(() => {
        onClick?.('delete', index);
      }, [onClick, index]);

      const TypeIcon = STEP_TYPE_ICON[step.type as StepContentType] ?? RiWindow2Line;
      const triggerCount = step.trigger?.length ?? 0;

      return (
        <div
          ref={ref}
          {...attributes}
          {...props}
          onClick={handleEdit}
          className="group cursor-pointer rounded-lg border border-transparent px-2 py-2 transition-colors hover:bg-muted"
        >
          <div className="flex min-h-6 items-center gap-2">
            <RiDraggable
              {...listeners}
              onClick={(event) => event.stopPropagation()}
              className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50"
            />
            <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
              {index + 1}
            </span>
            <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {step.name}
            </span>
            <TooltipProvider>
              <div className="flex shrink-0 items-center gap-1">
                {!isReachable && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        onClick={(event) => event.stopPropagation()}
                        className="grid size-6 shrink-0 cursor-help place-items-center text-warning"
                      >
                        <RiAlertLine className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">
                      {t('contentBuilder.flow.stepNotReachable')}
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditTrigger();
                      }}
                      // Always laid out (grid), shown via opacity — never
                      // display:none. A hidden anchor has a zero rect, and
                      // floating-ui occasionally positions the tooltip from
                      // it before layout settles, flashing the tooltip at the
                      // viewport's top-left for a frame.
                      className={cn(
                        'relative grid size-6 place-items-center rounded-md text-muted-foreground transition-opacity hover:bg-surface-raised hover:text-foreground',
                        triggerCount > 0
                          ? 'opacity-100'
                          : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
                      )}
                    >
                      <EventIcon2 className="h-4 w-4 opacity-70" />
                      {triggerCount > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-primary px-0.5 text-[10px] font-medium leading-none text-primary-foreground">
                          {triggerCount}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px]" disableCloseAnimation>
                    <p className="font-medium">
                      {triggerCount > 0
                        ? t('contentBuilder.flow.editTriggersTooltip', { total: triggerCount })
                        : t('contentBuilder.flow.addTriggerTooltip')}
                    </p>
                    <p className="mt-0.5 text-background/70">
                      {t('contentBuilder.flow.triggerTooltipDescription')}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          // See the trigger button above: kept laid out and
                          // toggled via opacity so its tooltip anchor always
                          // has a real rect (no top-left flash on hover).
                          className="pointer-events-none grid size-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-surface-raised hover:text-destructive group-hover:pointer-events-auto group-hover:opacity-100"
                        >
                          <Delete2Icon className="h-4 w-4 opacity-70" />
                        </button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent disableCloseAnimation>
                      {t('contentBuilder.flow.deleteStepTooltip')}
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t('contentBuilder.flow.deleteConfirmTitle')}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('contentBuilder.flow.deleteConfirmDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('contentBuilder.common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} variant={'destructive'}>
                        {t('contentBuilder.flow.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TooltipProvider>
          </div>
        </div>
      );
    },
  ),
);
SidebarContent.displayName = 'SidebarContent';

const SortableItem = memo(({ id, index, step, onClick, isReachable }: SortableItemProps) => {
  const { attributes, listeners, isDragging, setNodeRef, transform, transition } = useSortable({
    id,
  });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0 : 1,
    }),
    [transform, transition, isDragging],
  );

  return (
    <SidebarContent
      ref={setNodeRef}
      style={style}
      isReachable={isReachable}
      index={index}
      onClick={onClick}
      step={step}
      listeners={listeners}
      attributes={attributes}
    />
  );
});
SortableItem.displayName = 'SortableItem';

export const SidebarContents = () => {
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const { removeStep, reorderSteps, enterStepSubMode } = useFlowEditor();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance (px) before drag activates to prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Cache sortable items to avoid recreation on every render
  const sortableItems = useMemo(
    () => currentVersion?.steps?.map((step, index) => getStepId(step, index)) ?? [],
    [currentVersion?.steps],
  );

  // Cache steps with metadata (id, index, reachability) to avoid recalculation
  const stepsWithMeta = useMemo(
    () =>
      currentVersion?.steps?.map((step, index) => ({
        step,
        id: getStepId(step, index),
        index,
        isReachable: stepIsReachable(currentVersion.steps as Step[], step),
      })) ?? [],
    [currentVersion?.steps],
  );

  // Get active step for DragOverlay
  const activeStep = useMemo(() => {
    if (activeId === null || !currentVersion?.steps) {
      return null;
    }
    const activeIndex = stepsWithMeta.findIndex((item) => item.id === activeId);
    if (activeIndex === -1) {
      return null;
    }
    return stepsWithMeta[activeIndex];
  }, [activeId, currentVersion?.steps, stepsWithMeta]);

  const handleOnClick = useCallback(
    (action: string, index: number) => {
      const steps = currentVersion?.steps;
      if (!steps) {
        return;
      }
      if (action === 'delete') {
        removeStep(index);
        return;
      }
      // Row click ('edit') and the trigger button open a sub-view keyed by the
      // step's stable id (not its list position); the canvas previews the step
      // on entering 'detail'. The select-without-edit action was removed to
      // align flow with the other content types.
      enterStepSubMode(getStepId(steps[index], index), action === 'trigger' ? 'trigger' : 'detail');
    },
    [currentVersion?.steps, removeStep, enterStepSubMode],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveId(null);

      if (!active || !over || active.id === over.id || !currentVersion?.steps) {
        return;
      }

      const steps = currentVersion.steps;
      const oldIndex = steps.findIndex((step, i) => getStepId(step, i) === active.id);
      const newIndex = steps.findIndex((step, i) => getStepId(step, i) === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      reorderSteps(oldIndex, newIndex);
    },
    [currentVersion?.steps, reorderSteps],
  );

  if (!currentVersion?.steps) {
    return <></>;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          {stepsWithMeta.map(({ step, id, index, isReachable }) => (
            <SortableItem
              key={id}
              id={id}
              index={index}
              isReachable={isReachable}
              step={step}
              onClick={handleOnClick}
            />
          ))}
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeId !== null && activeStep ? (
            <SidebarContent
              index={activeStep.index}
              isReachable={activeStep.isReachable}
              step={activeStep.step}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};
SidebarContents.displayName = 'SidebarContents';
