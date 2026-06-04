import { RiDraggable, RiSettings3Line } from '@usertour/icons';
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
import { Delete2Icon } from '@usertour/icons';
import { ResourceCenterBlock, ResourceCenterBlockType } from '@usertour/types';
import { serializeBlockName } from '@usertour/helpers';
import { forwardRef } from 'react';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { SortableList } from '@/pages/contents/components/builder/components/sortable-list';
import {
  BLOCK_TYPE_LABELS,
  getResourceCenterBlockTypeIcon,
} from '@/pages/contents/components/builder/resource-center/resource-center-block-options';

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
    const BlockTypeIcon = getResourceCenterBlockTypeIcon(block.type);
    const nameText =
      block.type === ResourceCenterBlockType.ACTION ||
      block.type === ResourceCenterBlockType.SUB_PAGE ||
      block.type === ResourceCenterBlockType.CONTENT_LIST ||
      block.type === ResourceCenterBlockType.LIVE_CHAT
        ? serializeBlockName(block.name)
        : '';
    const label = nameText || typeLabel;
    return (
      <div
        ref={ref}
        {...attributes}
        style={style}
        className="bg-background-700 p-2.5 rounded-lg flex flex-col"
      >
        <div className="flex items-center justify-between">
          <div className="grow inline-flex items-center text-sm">
            <RiDraggable size={16} className="shrink-0 cursor-move -mr-0.5" {...listeners} />
            {BlockTypeIcon ? (
              <BlockTypeIcon width={16} height={16} className="h-4 w-4 shrink-0 mr-1" />
            ) : null}
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
                    <RiSettings3Line size={16} />
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

export const ResourceCenterBlocks = () => {
  const {
    data: localData,
    currentTabId,
    gotoBlock,
    removeBlock,
    reorderBlocks,
  } = useResourceCenterEditor();

  // Get current tab's blocks
  const currentTab = localData.tabs.find((t) => t.id === currentTabId);
  const blocks = currentTab?.blocks ?? [];

  const handleEditBlock = (block: ResourceCenterBlock) => {
    gotoBlock(block.id);
  };

  const handleOnClick = (action: 'edit' | 'delete', block: ResourceCenterBlock) => {
    if (action === 'edit') {
      handleEditBlock(block);
    } else if (action === 'delete') {
      removeBlock(block.id);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center space-x-1">
        <h1 className="text-sm">{currentTab?.name ? `"${currentTab.name}" blocks` : 'Blocks'}</h1>
      </div>
      <SortableList
        items={blocks}
        getId={(block) => block.id}
        onReorder={reorderBlocks}
        renderRow={(block, sortable) => (
          <BlockContent
            block={block}
            onClick={handleOnClick}
            ref={sortable.setNodeRef}
            style={sortable.style}
            listeners={sortable.listeners}
            attributes={sortable.attributes}
          />
        )}
        renderOverlay={(block) => <BlockContent block={block} />}
      />
    </>
  );
};

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';
