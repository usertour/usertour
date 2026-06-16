import { Delete2Icon, RiDraggable } from '@usertour/icons';
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
import { FieldSection } from '@usertour/ui';

interface BlockContentProps {
  index: number;
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

// A block row, styled like a flow step row: a transparent row that tints on
// hover, an ordinal badge, the block-type icon, a drag handle, and delete
// revealed on hover. Clicking the row opens the block editor — a resource
// center is a single panel widget (no per-block preview), so flow's row-select
// has no purpose here and the row click goes straight to edit.
const BlockContent = forwardRef<HTMLDivElement, BlockContentProps>((props, ref) => {
  const { onClick, listeners, attributes, block, style, index } = props;
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
      // The delete-confirm dialog is portaled to <body>, but React routes its
      // synthetic events through the JSX tree — so a click on the dialog's
      // Cancel/Delete/overlay bubbles back into this row and would open the
      // block editor. Only honor clicks that physically landed inside the row;
      // portaled dialog content is not a DOM descendant, so it's filtered out.
      onClick={(event) => {
        if (event.currentTarget.contains(event.target as Node)) {
          onClick?.('edit', block);
        }
      }}
      className="group cursor-pointer rounded-lg border border-transparent px-2 py-2 transition-colors hover:bg-muted"
    >
      <div className="flex min-h-6 items-center gap-2">
        <RiDraggable
          {...listeners}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50"
        />
        <span className="grid size-[22px] shrink-0 place-items-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
          {index + 1}
        </span>
        {BlockTypeIcon ? (
          <BlockTypeIcon
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={label}>
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <DeleteDialog onDelete={() => onClick?.('delete', block)}>
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="hidden size-6 place-items-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-destructive group-hover:grid"
            >
              <Delete2Icon className="h-4 w-4 opacity-70" />
            </button>
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
      <div className="flex flex-col gap-0.5">
        <SortableList
          items={blocks}
          getId={(block) => block.id}
          onReorder={reorderBlocks}
          renderRow={(block, sortable) => (
            <BlockContent
              index={blocks.findIndex((b) => b.id === block.id)}
              block={block}
              onClick={handleOnClick}
              ref={sortable.setNodeRef}
              style={sortable.style}
              listeners={sortable.listeners}
              attributes={sortable.attributes}
            />
          )}
          renderOverlay={(block) => (
            <BlockContent index={blocks.findIndex((b) => b.id === block.id)} block={block} />
          )}
        />
      </div>
    </FieldSection>
  );
};

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';
