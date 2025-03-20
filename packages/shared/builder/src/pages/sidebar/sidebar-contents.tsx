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
import {
  SortableContext,
  arrayMove,
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
} from '@usertour-ui/alert-dialog';
import { Button } from '@usertour-ui/button';
import { Delete2Icon, EventIcon2, EyeNoneIcon, ModelIcon, TooltipIcon } from '@usertour-ui/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { Step } from '@usertour-ui/types';
import { forwardRef, useCallback, useState } from 'react';

import { defaultStep } from '@usertour-ui/shared-utils';
import { BuilderMode, useBuilderContext } from '../../contexts';
import { stepIsReachable } from '../../utils/content-validate';

const SidebarContent = forwardRef<HTMLDivElement, any>(
  (
    { index, step, onClick, listeners = {}, attributes = {}, isReachable = true, ...props },
    ref,
  ) => {
    const handleEdit = () => {
      onClick('edit', index);
    };
    const handleEditTrigger = () => {
      onClick('trigger', index);
    };
    const handleDelete = () => {
      onClick('delete', index);
    };

    return (
      <div
        key={index}
        ref={ref}
        {...attributes}
        {...props}
        className="bg-background-700 p-2.5 rounded-lg py-3.5 flex flex-col"
      >
        <div className="flex items-center justify-between ">
          <div className="grow inline-flex items-center text-sm ">
            <DragHandleDots2Icon {...listeners} />
            {step.type === 'tooltip' && <TooltipIcon className="w-4 h-4 mt-0.5 mx-0.5" />}
            {step.type === 'modal' && <ModelIcon className="w-4 h-4 mt-0.5 mx-0.5" />}
            {step.type === 'hidden' && <EyeNoneIcon className="w-4 h-4 mx-0.5" />}
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
                <TooltipContent>Trigger</TooltipContent>
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
);

const SortableItem = ({ id, step, onClick, isReachable }: any) => {
  const { attributes, listeners, isDragging, setNodeRef, transform, transition } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <SidebarContent
      ref={setNodeRef}
      style={style}
      isReachable={isReachable}
      index={id}
      onClick={onClick}
      step={step}
      listeners={listeners}
      attributes={attributes}
    />
  );
};

export const SidebarContents = () => {
  const {
    setSelectorOutput,
    setCurrentIndex,
    setCurrentMode,
    currentVersion,
    setCurrentVersion,
    setCurrentStep,
  } = useBuilderContext();
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDeleteStep = (_: Step, index: number) => {
    setCurrentVersion((pre) => {
      if (pre?.steps) {
        const copySteps = [...pre.steps];
        copySteps.splice(index, 1);
        return { ...pre, steps: copySteps };
      }
    });
  };

  const handleEditStep = (step: Step, index: number, mode: BuilderMode) => {
    setSelectorOutput(null);
    const _step = JSON.parse(
      JSON.stringify({
        ...step,
        setting: { ...defaultStep.setting, ...step.setting },
      }),
    );
    setCurrentStep(_step);
    setCurrentIndex(index);
    setCurrentMode({ mode });
  };

  const handleOnClick = useCallback(
    (action: string, index: number) => {
      if (!currentVersion?.steps) {
        return;
      }
      const _step = currentVersion.steps[index];
      if (action === 'delete') {
        handleDeleteStep(_step, index);
      } else {
        const mode: BuilderMode =
          action === 'trigger' ? BuilderMode.FLOW_STEP_TRIGGER : BuilderMode.FLOW_STEP_DETAIL;
        handleEditStep(_step, index, mode);
      }
    },
    [currentVersion],
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!currentVersion?.steps) {
        return;
      }
      if (active && over && active.id !== over?.id) {
        const newList = arrayMove(currentVersion.steps, active.id as number, over.id as number);
        setCurrentVersion((pre) => {
          if (pre) {
            return { ...pre, steps: newList };
          }
        });
      }

      setActiveId(null);
    },
    [currentVersion],
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
        <SortableContext
          items={currentVersion?.steps.map((step, index) => {
            return { ...step, id: index };
          })}
          strategy={verticalListSortingStrategy}
        >
          {currentVersion.steps.map((step, index) => (
            <SortableItem
              key={index}
              id={index}
              isReachable={stepIsReachable(currentVersion.steps as Step[], step)}
              step={step}
              onClick={handleOnClick}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <SidebarContent
              index={activeId}
              isReachable={stepIsReachable(currentVersion.steps, currentVersion.steps[activeId])}
              step={currentVersion.steps[activeId]}
              // onClick={handleOnClick}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};
SidebarContents.displayName = 'SidebarContents';
