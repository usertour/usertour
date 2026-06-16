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
import { Delete2Icon, RiAddCircleLine, RiDraggable, RiSettings3Line } from '@usertour/icons';
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
import { cn } from '@usertour/tailwind';
import { ResourceCenterTab } from '@usertour/types';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { getActiveIcon } from '@/pages/contents/components/builder/components/icon-picker/utils';
import { type SortableRowProps } from '@/pages/contents/components/builder/components/sortable-list';
import { FieldSection } from '@usertour/ui';

interface TabContentProps {
  tab: ResourceCenterTab;
  isActive: boolean;
  canDelete: boolean;
  onClick?: (action: 'select' | 'edit' | 'delete', tab: ResourceCenterTab) => void;
  listeners?: SortableRowProps['listeners'];
  attributes?: SortableRowProps['attributes'];
  style?: React.CSSProperties;
}

interface DeleteTabDialogProps {
  onDelete: () => void;
  children: React.ReactNode;
}

const DeleteTabDialog = (props: DeleteTabDialogProps) => {
  const { onDelete, children } = props;
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent disableCloseAnimation>
            <p>{t('contentBuilder.resourceCenter.delete')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('contentBuilder.resourceCenter.deleteConfirmTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('contentBuilder.resourceCenter.tabDeleteDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('contentBuilder.common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} variant={'destructive'}>
            {t('contentBuilder.resourceCenter.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// A tab row, styled and behaving like a flow step row: a transparent row that
// tints on hover and highlights when selected, a drag handle, the tab icon, and
// edit/delete revealed on hover. Clicking the row SELECTS the tab (switches
// which tab's blocks show — a real toggle, unlike checklist), the gear opens
// the tab's settings.
const TabContent = forwardRef<HTMLDivElement, TabContentProps>((props, ref) => {
  const { tab, isActive, canDelete, onClick, listeners, attributes, style } = props;
  const { t } = useTranslation();
  const Icon = getActiveIcon(tab.iconType);
  return (
    <div
      ref={ref}
      {...attributes}
      style={style}
      // The delete-confirm dialog is portaled to <body>, but React routes its
      // synthetic events through the JSX tree — so a click on the dialog's
      // Cancel/Delete/overlay bubbles back into this row and would select the
      // tab. Only honor clicks that physically landed inside the row; portaled
      // dialog content is not a DOM descendant, so it's filtered out.
      onClick={(event) => {
        if (event.currentTarget.contains(event.target as Node)) {
          onClick?.('select', tab);
        }
      }}
      className={cn(
        'group cursor-pointer rounded-lg border border-transparent px-2 py-2 transition-colors',
        isActive ? 'border-primary/30 bg-accent/50' : 'hover:bg-muted',
      )}
    >
      <div className="flex min-h-6 items-center gap-2">
        <RiDraggable
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50"
        />
        {Icon ? (
          <Icon
            size={16}
            className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
          />
        ) : null}
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
          title={tab.name}
        >
          {tab.name || t('contentBuilder.resourceCenter.untitledTab')}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.('edit', tab);
                  }}
                  className="hidden size-6 place-items-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground group-hover:grid"
                >
                  <RiSettings3Line className="h-4 w-4 opacity-70" />
                </button>
              </TooltipTrigger>
              <TooltipContent disableCloseAnimation>
                {t('contentBuilder.resourceCenter.edit')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {canDelete && (
            <DeleteTabDialog onDelete={() => onClick?.('delete', tab)}>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="hidden size-6 place-items-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-destructive group-hover:grid"
              >
                <Delete2Icon className="h-4 w-4 opacity-70" />
              </button>
            </DeleteTabDialog>
          )}
        </div>
      </div>
    </div>
  );
});

TabContent.displayName = 'TabContent';

interface SortableTabProps {
  tab: ResourceCenterTab;
  isActive: boolean;
  canDelete: boolean;
  onClick: TabContentProps['onClick'];
}

const SortableTab = (props: SortableTabProps) => {
  const { tab, isActive, canDelete, onClick } = props;
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
  const {
    data: localData,
    currentTabId,
    startCreateTab,
    removeTab,
    reorderTabs,
    gotoTab,
    gotoTabSettings,
  } = useResourceCenterEditor();
  const { t } = useTranslation();

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const tabs = localData.tabs;

  const handleOnClick = (action: 'select' | 'edit' | 'delete', tab: ResourceCenterTab) => {
    if (action === 'select') {
      gotoTab(tab.id);
    } else if (action === 'edit') {
      gotoTabSettings(tab.id);
    } else if (action === 'delete') {
      removeTab(tab.id);
    }
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
    <FieldSection
      title={t('contentBuilder.resourceCenter.tabs')}
      tooltip={t('contentBuilder.resourceCenter.tabsTooltip')}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tabs} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5">
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === currentTabId}
                canDelete={tabs.length > 1}
                onClick={handleOnClick}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeTab ? <TabContent tab={activeTab} isActive={false} canDelete={false} /> : null}
        </DragOverlay>
      </DndContext>
      <Button
        variant="ghost"
        onClick={startCreateTab}
        className="mt-2 h-9 w-full rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:bg-accent/50 hover:text-primary"
      >
        <RiAddCircleLine className="mr-2 size-4 opacity-70" />
        {t('contentBuilder.resourceCenter.addTab')}
      </Button>
    </FieldSection>
  );
};

ResourceCenterTabs.displayName = 'ResourceCenterTabs';
