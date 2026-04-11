'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
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
import { RiDraggable, RiSettings3Line } from '@usertour-packages/icons';
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
} from '@usertour-packages/alert-dialog';
import { Button } from '@usertour-packages/button';
import { Delete2Icon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { LauncherIconSource, ResourceCenterTab } from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { forwardRef, useState } from 'react';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../../contexts';
import { getActiveIcon } from '../../../components/icon-picker/utils';

interface TabContentProps {
  tab: ResourceCenterTab;
  isActive: boolean;
  canDelete: boolean;
  onClick?: (action: 'select' | 'edit' | 'delete', tab: ResourceCenterTab) => void;
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
  style?: React.CSSProperties;
}

const DeleteTabDialog = ({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: React.ReactNode;
}) => (
  <AlertDialog>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
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
          This will delete the tab and all its blocks. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onDelete} variant={'destructive'}>
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const TabContent = forwardRef<HTMLDivElement, TabContentProps>(
  ({ tab, isActive, canDelete, onClick, listeners = {}, attributes = {}, style }, ref) => {
    const Icon = getActiveIcon(tab.iconType);
    return (
      <div
        ref={ref}
        {...attributes}
        style={style}
        className={`p-2.5 rounded-lg flex flex-col cursor-pointer ${
          isActive ? 'bg-primary/10 ring-1 ring-primary' : 'bg-background-700'
        }`}
        onClick={() => onClick?.('select', tab)}
      >
        <div className="flex items-center justify-between">
          <div className="grow inline-flex items-center text-sm">
            <RiDraggable
              size={16}
              className="shrink-0 cursor-move -mr-0.5"
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            />
            {Icon ? <Icon size={16} className="h-4 w-4 shrink-0 mr-1" /> : null}
            <span className="w-36 truncate" title={tab.name}>
              {tab.name || 'Untitled tab'}
            </span>
          </div>

          <div className="flex-none flex gap-1" onClick={(e) => e.stopPropagation()}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-fit"
                    onClick={() => onClick?.('edit', tab)}
                  >
                    <RiSettings3Line size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {canDelete && (
              <DeleteTabDialog onDelete={() => onClick?.('delete', tab)}>
                <Button variant="ghost" size="sm" className="p-1 h-fit">
                  <Delete2Icon className="h-4 w-4 text-foreground" />
                </Button>
              </DeleteTabDialog>
            )}
          </div>
        </div>
      </div>
    );
  },
);

TabContent.displayName = 'TabContent';

const SortableTab = ({
  tab,
  isActive,
  canDelete,
  onClick,
}: {
  tab: ResourceCenterTab;
  isActive: boolean;
  canDelete: boolean;
  onClick: TabContentProps['onClick'];
}) => {
  const { attributes, listeners, isDragging, setNodeRef, transform, transition } = useSortable({
    id: tab.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <TabContent
      ref={setNodeRef}
      tab={tab}
      isActive={isActive}
      canDelete={canDelete}
      style={style}
      onClick={onClick}
      listeners={listeners}
      attributes={attributes}
    />
  );
};

export const ResourceCenterTabs = () => {
  const { setCurrentMode } = useBuilderContext();
  const {
    localData,
    currentTabId,
    setCurrentTabId,
    addTab,
    removeTab,
    reorderTabs,
    setEditingTab,
  } = useResourceCenterContext();

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!localData) {
    return null;
  }

  const tabs = localData.tabs;

  const handleOnClick = (action: 'select' | 'edit' | 'delete', tab: ResourceCenterTab) => {
    if (action === 'select') {
      setCurrentTabId(tab.id);
    } else if (action === 'edit') {
      setEditingTab({ ...tab });
      setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER_TAB });
    } else if (action === 'delete') {
      removeTab(tab.id);
    }
  };

  const handleAddTab = () => {
    const tab: ResourceCenterTab = {
      id: uuidV4(),
      name: '',
      iconSource: LauncherIconSource.BUILTIN,
      iconType: 'home-line',
      blocks: [],
    };
    addTab(tab);
    setEditingTab({ ...tab });
    setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER_TAB });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (active && over && active.id !== over.id) {
      const from = tabs.findIndex((tab) => tab.id === active.id);
      const to = tabs.findIndex((tab) => tab.id === over.id);
      if (from !== -1 && to !== -1) {
        reorderTabs(from, to);
      }
    }
    setActiveId(null);
  };

  const activeTab = tabs.find((tab) => tab.id === activeId);

  return (
    <>
      <div className="flex justify-between items-center space-x-1">
        <h1 className="text-sm">Tabs</h1>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tabs} strategy={verticalListSortingStrategy}>
          {tabs.map((tab) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              isActive={tab.id === currentTabId}
              canDelete={tabs.length > 1}
              onClick={handleOnClick}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeTab ? <TabContent tab={activeTab} isActive={false} canDelete={false} /> : null}
        </DragOverlay>
      </DndContext>
      <Button className="w-full" variant="secondary" onClick={handleAddTab}>
        <span className="mr-2">+</span>
        Add tab
      </Button>
    </>
  );
};

ResourceCenterTabs.displayName = 'ResourceCenterTabs';
