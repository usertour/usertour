import { arrayMove } from '@dnd-kit/sortable';
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
import { Delete2Icon, RiDraggable } from '@usertour/icons';
import { ChecklistItemType } from '@usertour/types';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useChecklistEditor } from '@/pages/contents/components/builder/checklist/use-checklist-editor';
import {
  SortableList,
  type SortableRowProps,
} from '@/pages/contents/components/builder/components/sortable-list';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

type RowAction = 'edit' | 'delete';

interface ChecklistContentProps {
  index: number;
  onClick?: (action: RowAction, item: ChecklistItemType) => void;
  listeners?: SortableRowProps['listeners'];
  attributes?: SortableRowProps['attributes'];
  item: ChecklistItemType;
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
            <p>{t('contentBuilder.checklist.delete')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('contentBuilder.checklist.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('contentBuilder.checklist.deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('contentBuilder.common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} variant={'destructive'}>
            {t('contentBuilder.checklist.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// A checklist item row, styled like a flow step row: a transparent row that
// tints on hover, an ordinal badge, a drag handle, and a delete revealed on
// hover. Clicking the row opens the item editor — checklist is a single widget
// (no per-item preview), so flow's row-select highlight has no purpose here and
// the row click goes straight to edit (which also makes a gear button
// redundant).
const ChecklistContent = forwardRef<HTMLDivElement, ChecklistContentProps>((props, ref) => {
  const { onClick, listeners, attributes, item, style, index } = props;
  return (
    <div
      ref={ref}
      {...attributes}
      style={style}
      onClick={() => onClick?.('edit', item)}
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
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
          title={item.name}
        >
          {item.name}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <DeleteDialog onDelete={() => onClick?.('delete', item)}>
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              className="hidden size-6 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-destructive group-hover:grid"
            >
              <Delete2Icon className="h-4 w-4 opacity-70" />
            </button>
          </DeleteDialog>
        </div>
      </div>
    </div>
  );
});
ChecklistContent.displayName = 'ChecklistContent';

export const ChecklistContents = () => {
  const {
    data: localData,
    updateData: updateLocalData,
    gotoItem,
    removeItem,
  } = useChecklistEditor();
  const { t } = useTranslation();

  const handleOnClick = (action: RowAction, item: ChecklistItemType) => {
    if (action === 'edit') {
      gotoItem(item.id);
    } else if (action === 'delete') {
      removeItem(item.id);
    }
  };

  return (
    <FieldSection title={t('contentBuilder.checklist.items')}>
      <div className="flex flex-col gap-0.5">
        <SortableList
          items={localData.items}
          getId={(item) => item.id}
          onReorder={(fromIndex, toIndex) =>
            updateLocalData({ items: arrayMove(localData.items, fromIndex, toIndex) })
          }
          renderRow={(item, sortable) => (
            <ChecklistContent
              index={localData.items.findIndex((it) => it.id === item.id)}
              item={item}
              onClick={handleOnClick}
              ref={sortable.setNodeRef}
              style={sortable.style}
              listeners={sortable.listeners}
              attributes={sortable.attributes}
            />
          )}
          renderOverlay={(item) => (
            <ChecklistContent
              index={localData.items.findIndex((it) => it.id === item.id)}
              item={item}
            />
          )}
        />
      </div>
    </FieldSection>
  );
};

ChecklistContents.displayName = 'ChecklistContents';
