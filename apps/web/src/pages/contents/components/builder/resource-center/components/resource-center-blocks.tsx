import { Delete2Icon, RiDraggable, RiSettings3Line } from '@usertour/icons';
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
import { ResourceCenterBlock, ResourceCenterBlockType } from '@usertour/types';
import { serializeBlockName } from '@usertour/helpers';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import {
  SortableList,
  type SortableRowProps,
} from '@/pages/contents/components/builder/components/sortable-list';
import {
  BLOCK_TYPE_LABELS,
  getResourceCenterBlockTypeIcon,
} from '@/pages/contents/components/builder/resource-center/resource-center-block-options';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

interface BlockContentProps {
  onClick?: (action: 'edit' | 'delete', block: ResourceCenterBlock) => void;
  listeners?: SortableRowProps['listeners'];
  attributes?: SortableRowProps['attributes'];
  block: ResourceCenterBlock;
  style?: React.CSSProperties;
}

interface DeleteDialogProps {
  onDelete: () => void;
  children: React.ReactNode;
}

const DeleteDialog = (props: DeleteDialogProps) => {
  const { onDelete, children } = props;
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
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
            {t('contentBuilder.resourceCenter.deleteConfirmDescription')}
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

const BlockContent = forwardRef<HTMLDivElement, BlockContentProps>((props, ref) => {
  const { onClick, listeners, attributes, block, style } = props;
  const { t } = useTranslation();
  const typeLabel = t(BLOCK_TYPE_LABELS[block.type]);
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
      className="bg-slate-50 p-2.5 rounded-lg flex flex-col"
    >
      <div className="flex items-center justify-between">
        <div className="grow inline-flex items-center text-sm">
          <RiDraggable
            size={16}
            className="shrink-0 cursor-move -mr-0.5 opacity-70"
            {...listeners}
          />
          {BlockTypeIcon ? (
            <BlockTypeIcon width={16} height={16} className="h-4 w-4 shrink-0 mr-1 opacity-70" />
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
                  <RiSettings3Line size={16} className="opacity-70" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('contentBuilder.resourceCenter.edit')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DeleteDialog onDelete={() => onClick?.('delete', block)}>
            <Button variant="ghost" size="sm" className="p-1 h-fit">
              <Delete2Icon className="h-4 w-4 text-foreground opacity-70" />
            </Button>
          </DeleteDialog>
        </div>
      </div>
    </div>
  );
});
BlockContent.displayName = 'BlockContent';

export const ResourceCenterBlocks = () => {
  const {
    data: localData,
    currentTabId,
    gotoBlock,
    removeBlock,
    reorderBlocks,
  } = useResourceCenterEditor();
  const { t } = useTranslation();

  const currentTab = localData.tabs.find((tab) => tab.id === currentTabId);
  const blocks = currentTab?.blocks ?? [];

  const handleOnClick = (action: 'edit' | 'delete', block: ResourceCenterBlock) => {
    if (action === 'edit') {
      gotoBlock(block.id);
    } else if (action === 'delete') {
      removeBlock(block.id);
    }
  };

  return (
    <FieldSection
      title={
        currentTab?.name
          ? t('contentBuilder.resourceCenter.blocksOf', { name: currentTab.name })
          : t('contentBuilder.resourceCenter.blocks')
      }
    >
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
    </FieldSection>
  );
};

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';
