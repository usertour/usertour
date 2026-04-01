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
import { DragHandleDots2Icon, GearIcon } from '@radix-ui/react-icons';
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
import { ResourceCenterBlock, ResourceCenterBlockType } from '@usertour/types';
import { forwardRef, useState } from 'react';
import { BuilderMode, useBuilderContext, useResourceCenterContext } from '../../../contexts';

const BLOCK_TYPE_LABELS: Record<ResourceCenterBlockType, string> = {
  [ResourceCenterBlockType.ACTION]: 'Action',
  [ResourceCenterBlockType.MESSAGE]: 'Message',
  [ResourceCenterBlockType.DIVIDER]: 'Divider line',
  [ResourceCenterBlockType.SUB_PAGE]: 'Sub-page',
  [ResourceCenterBlockType.CONTACT]: 'Contact',
  [ResourceCenterBlockType.CONTENT_LIST]: 'List of flows/checklists',
  [ResourceCenterBlockType.AI_ASSISTANT]: 'AI Assistant',
  [ResourceCenterBlockType.ANNOUNCEMENTS]: 'Announcements',
  [ResourceCenterBlockType.KNOWLEDGE_BASE]: 'Knowledge base',
  [ResourceCenterBlockType.CHECKLIST]: 'Checklist',
};

interface BlockContentProps {
  onClick?: (action: 'edit' | 'delete', block: ResourceCenterBlock) => void;
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
  block: ResourceCenterBlock;
  style?: React.CSSProperties;
}

const DeleteDialog = ({
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
          After deletion, it will not be possible to access or recover the data through any means.
          Please confirm.
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

const BlockContent = forwardRef<HTMLDivElement, BlockContentProps>(
  ({ onClick, listeners = {}, attributes = {}, block, style }, ref) => {
    const typeLabel = BLOCK_TYPE_LABELS[block.type] ?? block.type;
    const label =
      block.type === ResourceCenterBlockType.ACTION && block.name ? block.name : typeLabel;
    return (
      <div
        ref={ref}
        {...attributes}
        style={style}
        className="bg-background-700 p-2.5 rounded-lg flex flex-col"
      >
        <div className="flex items-center justify-between">
          <div className="grow inline-flex items-center text-sm gap-2">
            <DragHandleDots2Icon className="cursor-move" {...listeners} />
            <span className="w-36 truncate" title={label}>
              {label}
            </span>
          </div>

          <div className="flex-none flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-fit"
                    onClick={() => onClick?.('edit', block)}
                  >
                    <GearIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DeleteDialog onDelete={() => onClick?.('delete', block)}>
              <Button variant="ghost" size="sm" className="p-1 h-fit">
                <Delete2Icon className="h-4 w-4 text-foreground" />
              </Button>
            </DeleteDialog>
          </div>
        </div>
      </div>
    );
  },
);

const SortableBlock = ({ id, onClick, block }: any) => {
  const { attributes, listeners, isDragging, setNodeRef, transform, transition } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <BlockContent
      ref={setNodeRef}
      block={block}
      style={style}
      onClick={onClick}
      listeners={listeners}
      attributes={attributes}
    />
  );
};

export const ResourceCenterBlocks = () => {
  const { setCurrentMode } = useBuilderContext();
  const { localData, updateLocalData, setCurrentBlock, removeBlock } = useResourceCenterContext();

  if (!localData) {
    return null;
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleEditBlock = (block: ResourceCenterBlock) => {
    setCurrentBlock(block);
    setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER_BLOCK });
  };

  const handleOnClick = (action: 'edit' | 'delete', block: ResourceCenterBlock) => {
    if (action === 'edit') {
      handleEditBlock(block);
    } else if (action === 'delete') {
      removeBlock(block.id);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (active && over && active.id !== over?.id) {
      const from = localData.blocks.findIndex((block) => block.id === active.id);
      const to = localData.blocks.findIndex((block) => block.id === over.id);
      const newList = arrayMove(localData.blocks, from, to);
      updateLocalData({ blocks: newList });
      setActiveId(null);
    }
  };

  const activeBlock = localData.blocks.find((block) => block.id === activeId);

  return (
    <>
      <div className="flex justify-between items-center space-x-1">
        <h1 className="text-sm">Blocks</h1>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={localData.blocks} strategy={verticalListSortingStrategy}>
          {localData.blocks.map((block) => (
            <SortableBlock id={block.id} onClick={handleOnClick} key={block.id} block={block} />
          ))}
        </SortableContext>
        <DragOverlay>{activeBlock ? <BlockContent block={activeBlock} /> : null}</DragOverlay>
      </DndContext>
    </>
  );
};

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';
