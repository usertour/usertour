import { arrayMove } from '@dnd-kit/sortable';
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
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { Delete2Icon } from '@usertour/icons';
import { ChecklistItemType } from '@usertour/types';
import { forwardRef } from 'react';
import { useChecklistEditor } from '@/pages/contents/components/builder/checklist/use-checklist-editor';
import { SortableList } from '@/pages/contents/components/builder/components/sortable-list';
// Add interface for component props
interface ChecklistContentProps {
  onClick?: (action: 'edit' | 'delete', item: ChecklistItemType) => void;
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
  item: ChecklistItemType;
  style?: React.CSSProperties;
}

// Extract DeleteDialog as a separate component
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

// Optimized ChecklistContent component
const ChecklistContent = forwardRef<HTMLDivElement, ChecklistContentProps>(
  ({ onClick, listeners = {}, attributes = {}, item, style }, ref) => {
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
                    <GearIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DeleteDialog onDelete={() => onClick?.('delete', item)}>
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

export const ChecklistContents = () => {
  const {
    data: localData,
    updateData: updateLocalData,
    gotoItem,
    removeItem,
  } = useChecklistEditor();

  if (!localData) {
    return null;
  }

  const handleEditItem = (item: ChecklistItemType) => {
    gotoItem(item.id);
  };

  const handleOnClick = (action: 'edit' | 'delete', item: ChecklistItemType) => {
    if (action === 'edit') {
      handleEditItem(item);
    } else if (action === 'delete') {
      removeItem(item.id);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center space-x-1	">
        <h1 className="text-sm">Items</h1>
      </div>
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
    </>
  );
};

ChecklistContents.displayName = 'ChecklistContents';
