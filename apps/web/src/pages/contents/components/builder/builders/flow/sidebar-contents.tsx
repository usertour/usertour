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
import { DragHandleDots2Icon, ExclamationTriangleIcon, GearIcon } from '@radix-ui/react-icons';
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
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import {
  Delete2Icon,
  EventIcon2,
  EyeNoneIcon,
  ModelIcon,
  RiMessageFill,
  TooltipIcon,
} from '@usertour/icons';
import { Step, StepContentType } from '@usertour/types';
import { forwardRef, memo, useCallback, useMemo, useState } from 'react';

import { BuilderMode, useBuilderStore } from '../../core';
import { useFlowEditor } from './use-flow-editor';
import { stepIsReachable } from '../../utils/content-validate';

// Get stable unique identifier for a step
const getStepId = (step: Step, index: number): string => {
  return step.id ?? step.cvid ?? `step-${index}`;
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
      const handleEdit = useCallback(() => {
        onClick?.('edit', index);
      }, [onClick, index]);

      const handleEditTrigger = useCallback(() => {
        onClick?.('trigger', index);
      }, [onClick, index]);

      const handleDelete = useCallback(() => {
        onClick?.('delete', index);
      }, [onClick, index]);

      return (
        <div
          ref={ref}
          {...attributes}
          {...props}
          className="bg-background-700 p-2.5 rounded-lg py-3.5 flex flex-col"
        >
          <div className="flex items-center justify-between ">
            <div className="grow inline-flex items-center text-sm ">
              <DragHandleDots2Icon {...listeners} className="cursor-move" />
              {step.type === StepContentType.TOOLTIP && (
                <TooltipIcon className="w-4 h-4 mt-0.5 mx-0.5" />
              )}
              {step.type === StepContentType.MODAL && (
                <ModelIcon className="w-4 h-4 mt-0.5 mx-0.5" />
              )}
              {step.type === StepContentType.HIDDEN && <EyeNoneIcon className="w-4 h-4 mx-0.5" />}
              {step.type === StepContentType.BUBBLE && <RiMessageFill className="w-4 h-4 mx-0.5" />}
              <span className="w-36 truncate ...">
                {index + 1}. {step.name}
              </span>
            </div>
            <div className="flex-none">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-fit" onClick={handleEdit}>
                      <GearIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-fit"
                      onClick={handleEditTrigger}
                    >
                      <EventIcon2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {step.trigger && step.trigger.length > 0
                      ? `${step.trigger.length} ${step.trigger.length === 1 ? 'Trigger' : 'Triggers'}`
                      : 'Add Trigger'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <AlertDialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-fit">
                          <Delete2Icon
                            className="h-4 w-4 text-foreground"
                            // onClick={handleDelete}
                          />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      After deletion, it will not be possible to access or recover the data through
                      any means. Please confirm.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} variant={'destructive'}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          {!isReachable && (
            <div className="flex items-stretch items-center text-warning space-x-1">
              <div className="flex-none self-start pt-1">
                <ExclamationTriangleIcon className="h-3 w-3" />
              </div>
              <span className="text-xs grow ">
                Step is not reachable from the start step. Add a button, trigger that links to this
                step, or delete it.
              </span>
            </div>
          )}
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
      if (!currentVersion?.steps) {
        return;
      }
      if (action === 'delete') {
        removeStep(index);
        return;
      }
      const step = currentVersion.steps[index];
      const mode: BuilderMode =
        action === 'trigger' ? BuilderMode.FLOW_STEP_TRIGGER : BuilderMode.FLOW_STEP_DETAIL;
      enterStepSubMode(step, index, mode);
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
