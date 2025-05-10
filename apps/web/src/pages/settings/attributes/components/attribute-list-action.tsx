import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { Attribute } from '@/types/project';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { Delete2Icon, EditIcon } from '@usertour-ui/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { useState } from 'react';
import { AttributeDeleteForm } from './attribute-delete-form';
import { AttributeEditForm } from './attribute-edit-form';
import { useAppContext } from '@/contexts/app-context';

type AttributeListActionProps = {
  attribute: Attribute;
};
export const AttributeListAction = (props: AttributeListActionProps) => {
  const { attribute } = props;
  const [open, setOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const { refetch } = useAttributeListContext();
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
  if (attribute.predefined) {
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
            <p>Predefned attributes can't be edited.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      {
        <DropdownMenu>
          <DropdownMenuTrigger disabled={attribute.predefined || isViewOnly} asChild>
            <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuItem onClick={handleOpen}>
              <EditIcon className="w-6" width={12} height={12} />
              Edit attribute
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDeleteOpen}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Delete2Icon className="w-6" width={16} height={16} />
              Delete attribute
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      <AttributeEditForm attribute={attribute} isOpen={open} onClose={handleOnClose} />
      <AttributeDeleteForm
        data={attribute}
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onSubmit={handleDeleteClose}
      />
    </>
  );
};

AttributeListAction.displayName = 'AttributeListAction';
