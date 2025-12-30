import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { Environment } from '@usertour/types';
import { DotsHorizontalIcon, StarIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { Delete2Icon, EditIcon } from '@usertour-packages/icons';
import { useState } from 'react';
import { EnvironmentDeleteForm } from './environment-delete-form';
import { EnvironmentEditForm } from './environment-edit-form';
import { useAppContext } from '@/contexts/app-context';
import { useMutation } from '@apollo/client';
import { updateEnvironments } from '@usertour-packages/gql';
import { useToast } from '@usertour-packages/use-toast';
import { getErrorMessage } from '@usertour/helpers';
type EnvironmentListActionProps = {
  environment: Environment;
  environmentCount?: number;
};
export const EnvironmentListAction = (props: EnvironmentListActionProps) => {
  const { environment, environmentCount = 0 } = props;
  const [open, setOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const { refetch } = useEnvironmentListContext();
  const { isViewOnly } = useAppContext();
  const { toast } = useToast();
  const [updateMutation] = useMutation(updateEnvironments);
  const isDeleteDisabled = environmentCount <= 1 || isViewOnly || environment.isPrimary === true;
  const isNotPrimary = environment.isPrimary !== true;

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

  const handleSetPrimary = async () => {
    if (isViewOnly || isSettingPrimary) {
      return;
    }

    setIsSettingPrimary(true);
    try {
      const response = await updateMutation({
        variables: {
          id: environment.id,
          name: environment.name,
          isPrimary: true,
        },
      });
      if (response.data?.updateEnvironments?.id) {
        toast({
          variant: 'success',
          title: 'Environment set as primary successfully.',
        });
        refetch();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
    setIsSettingPrimary(false);
  };
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
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem onClick={handleOpen}>
            <EditIcon className="w-6" width={12} height={12} />
            Rename environment
          </DropdownMenuItem>
          {isNotPrimary && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSetPrimary}
                disabled={isViewOnly || isSettingPrimary}
              >
                <StarIcon className="w-4 h-4 mr-2" />
                Make this the primary environment
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteOpen}
            disabled={isDeleteDisabled}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Delete2Icon className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EnvironmentEditForm environment={environment} isOpen={open} onClose={handleOnClose} />
      <EnvironmentDeleteForm
        data={environment}
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onSubmit={handleDeleteClose}
      />
    </>
  );
};

EnvironmentListAction.displayName = 'EnvironmentListAction';
