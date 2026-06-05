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
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { Delete2Icon, RiDraggable, RiSettings3Line } from '@usertour/icons';
import { ChecklistItemType } from '@usertour/types';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useChecklistEditor } from '@/pages/contents/components/builder/checklist/use-checklist-editor';
import {
  SortableList,
  type SortableRowProps,
} from '@/pages/contents/components/builder/components/sortable-list';
import { FieldSection } from '@/pages/contents/components/builder/shared/fields';

interface ChecklistContentProps {
  onClick?: (action: 'edit' | 'delete', item: ChecklistItemType) => void;
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
          <TooltipContent>
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

const ChecklistContent = forwardRef<HTMLDivElement, ChecklistContentProps>((props, ref) => {
  const { onClick, listeners, attributes, item, style } = props;
  const { t } = useTranslation();
  return (
    <div
      ref={ref}
      {...attributes}
      style={style}
      className="bg-background-700 p-2.5 rounded-lg flex flex-col"
    >
      <div className="flex items-center justify-between">
        <div className="grow inline-flex items-center text-sm gap-2">
          <RiDraggable className="cursor-move size-4 opacity-70" {...listeners} />
          <span className="w-36 truncate" title={item.name}>
            {item.name}
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
                  onClick={() => onClick?.('edit', item)}
                >
                  <RiSettings3Line className="h-4 w-4 opacity-70" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('contentBuilder.checklist.edit')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DeleteDialog onDelete={() => onClick?.('delete', item)}>
            <Button variant="ghost" size="sm" className="p-1 h-fit">
              <Delete2Icon className="h-4 w-4 text-foreground opacity-70" />
            </Button>
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

  const handleOnClick = (action: 'edit' | 'delete', item: ChecklistItemType) => {
    if (action === 'edit') {
      gotoItem(item.id);
    } else if (action === 'delete') {
      removeItem(item.id);
    }
  };

  return (
    <FieldSection title={t('contentBuilder.checklist.items')}>
      <SortableList
        items={localData.items}
        getId={(item) => item.id}
        onReorder={(fromIndex, toIndex) =>
          updateLocalData({ items: arrayMove(localData.items, fromIndex, toIndex) })
        }
        renderRow={(item, sortable) => (
          <ChecklistContent
            item={item}
            onClick={handleOnClick}
            ref={sortable.setNodeRef}
            style={sortable.style}
            listeners={sortable.listeners}
            attributes={sortable.attributes}
          />
        )}
        renderOverlay={(item) => <ChecklistContent item={item} />}
      />
    </FieldSection>
  );
};

ChecklistContents.displayName = 'ChecklistContents';
