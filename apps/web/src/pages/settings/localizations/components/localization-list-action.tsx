import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { useMutation } from '@apollo/client';
import { DotsHorizontalIcon, StarFilledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { setDefaultLocalization } from '@usertour-packages/gql';
import { EditIcon } from '@usertour-packages/icons';
import { getErrorMessage } from '@usertour/helpers';
import { Localization } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { LocalizationDeleteForm } from './localization-delete-form';
import { LocalizationEditForm } from './localization-edit-form';

type LocalizationListActionProps = {
  localization: Localization;
};
export const LocalizationListAction = (props: LocalizationListActionProps) => {
  const { localization } = props;
  const [open, setOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const { refetch } = useLocalizationListContext();
  const [setDefaultMutation] = useMutation(setDefaultLocalization);
  const { toast } = useToast();
  const handleOpen = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };
  const handleDeleteClose = () => {
    setOpenDeleteDialog(false);
    refetch();
  };

  const handleSetAsDefault = async () => {
    try {
      await setDefaultMutation({
        variables: {
          id: localization.id,
        },
      });
      await refetch();
      // onSubmit("setAsDefault");
      toast({
        variant: 'success',
        title: 'The localization has been successfully set as default',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <>
      {
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuItem onClick={handleOpen}>
              <EditIcon className="w-6" width={12} height={12} />
              Edit localization
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSetAsDefault} disabled={localization.isDefault}>
              <StarFilledIcon className="mr-1" width={15} height={15} />
              Set as company default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      <LocalizationEditForm localization={localization} isOpen={open} onClose={handleOnClose} />
      <LocalizationDeleteForm
        data={localization}
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onSubmit={handleDeleteClose}
      />
    </>
  );
};

LocalizationListAction.displayName = 'LocalizationListAction';
