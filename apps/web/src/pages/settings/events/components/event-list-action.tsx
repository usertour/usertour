import { useEventListContext } from '@/contexts/event-list-context';
import { Event } from '@/types/project';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { CloseIcon, EditIcon } from '@usertour-ui/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { useState } from 'react';
import { EventDeleteForm } from './event-delete-form';
import { EventEditForm } from './event-edit-form';
import { useAppContext } from '@/contexts/app-context';
type EventListActionProps = {
  event: Event;
};
export const EventListAction = (props: EventListActionProps) => {
  const { event } = props;
  const [open, setOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const { refetch } = useEventListContext();
  const { isViewOnly } = useAppContext();
  const handleOpen = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };
  const handleDeleteOpen = () => {
    setOpenDeleteDialog(true);
  };
  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    refetch();
  };

  if (event.predefined) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-8 w-8 p-0 data-[state=open]:bg-muted opacity-50"
              disabled={isViewOnly}
            >
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-slate-700">
            <p>Predefned events can't be edited.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            disabled={isViewOnly}
          >
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuItem onClick={handleOpen}>
            <EditIcon className="w-6" width={12} height={12} />
            Edit event
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDeleteOpen}>
            <CloseIcon className="w-6" width={16} height={16} />
            Delete event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EventEditForm event={event} isOpen={open} onClose={handleOnClose} />
      <EventDeleteForm
        data={event}
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onSubmit={handleDeleteClose}
      />
    </>
  );
};

EventListAction.displayName = 'EventListAction';
