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

// Per step-type: the row glyph + the i18n key for its short type label
// (shown on the right of the row, hidden on hover to make room for actions).
const STEP_TYPE_META: Partial<
  Record<StepContentType, { Icon: ComponentType<{ className?: string }>; labelKey: string }>
> = {
  [StepContentType.TOOLTIP]: {
    Icon: RiChat2Line,
    labelKey: 'contentBuilder.flow.stepType.tooltip',
  },
  [StepContentType.MODAL]: { Icon: RiWindow2Line, labelKey: 'contentBuilder.flow.stepType.modal' },
  [StepContentType.HIDDEN]: { Icon: RiEyeOffLine, labelKey: 'contentBuilder.flow.stepType.hidden' },
  [StepContentType.BUBBLE]: {
    Icon: RiMessage2Line,
    labelKey: 'contentBuilder.flow.stepType.bubble',
  },
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
      const handleEdit = useCallback(() => {
        onClick?.('edit', index);
      }, [onClick, index]);

      const handleEditTrigger = useCallback(() => {
        onClick?.('trigger', index);
      }, [onClick, index]);

      const handleDelete = useCallback(() => {
        onClick?.('delete', index);
      }, [onClick, index]);

      const meta =
        STEP_TYPE_META[step.type as StepContentType] ?? STEP_TYPE_META[StepContentType.MODAL];
      const TypeIcon = meta?.Icon ?? RiWindow2Line;
      const triggerCount = step.trigger?.length ?? 0;

      return (
        <div
          ref={ref}
          {...attributes}
          {...props}
          onClick={handleEdit}
          className="group cursor-pointer rounded-lg border border-transparent px-2 py-2 transition-colors hover:bg-slate-100"
        >
          <div className="flex min-h-6 items-center gap-2">
            <RiDraggable
              {...listeners}
              onClick={(event) => event.stopPropagation()}
              className="h-4 w-4 shrink-0 cursor-grab text-slate-300"
            />
            <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-slate-200 text-[11px] font-semibold text-slate-600">
              {index + 1}
            </span>
            <TypeIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {step.name}
            </span>
            {!isReachable && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      onClick={(event) => event.stopPropagation()}
                      className="flex shrink-0 cursor-help items-center text-warning"
                    >
                      <RiAlertLine className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px]">
                    {t('contentBuilder.flow.stepNotReachable')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditTrigger();
                      }}
                      className={cn(
                        'relative size-6 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-foreground',
                        triggerCount > 0 ? 'grid' : 'hidden group-hover:grid',
                      )}
                    >
                      <EventIcon2 className="h-4 w-4 opacity-70" />
                      {triggerCount > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-primary px-0.5 text-[10px] font-semibold leading-none text-white">
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
                <span className="text-[11px] text-slate-400 group-hover:hidden">
                  {meta ? t(meta.labelKey) : null}
                </span>
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="hidden size-6 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-destructive group-hover:grid"
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
