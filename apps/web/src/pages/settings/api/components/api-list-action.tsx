import { useApiContext } from '@/contexts/api-context';
import { AccessToken, useDeleteAccessTokenMutation } from '@usertour-ui/shared-hooks';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { Delete2Icon } from '@usertour-ui/icons';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-ui/alert-dialog';
import { useToast } from '@usertour-ui/use-toast';

// Constants for better maintainability
const DROPDOWN_WIDTH = 200;
const ICON_SIZE = 16;

// Type definitions
type ApiListActionProps = {
  token: AccessToken;
};

type DeleteDialogProps = {
  token: AccessToken;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
  isLoading: boolean;
};

/**
 * Delete confirmation dialog component
 */
const DeleteDialog = ({ token, isOpen, onOpenChange, onDelete, isLoading }: DeleteDialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Delete API key <span className="font-bold text-foreground">{token.name}</span>
        </AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete this API key? This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={onDelete}
          disabled={isLoading}
          className="min-w-[80px]"
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/**
 * Component for managing API token actions (currently only delete)
 */
export const ApiListAction = ({ token }: ApiListActionProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { refetch } = useApiContext();
  const { isViewOnly } = useAppContext();
  const { invoke: deleteAccessToken, loading: isDeleting } = useDeleteAccessTokenMutation();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const success = await deleteAccessToken(token.id);
      if (success) {
        await refetch();
        setIsDeleteDialogOpen(false);
        toast({
          variant: 'success',
          title: 'API key deleted successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to delete API key',
        });
      }
    } catch (error) {
      console.error('Failed to delete access token:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete API key',
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger disabled={isViewOnly} asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            aria-label="Open token actions menu"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={`w-[${DROPDOWN_WIDTH}px]`}>
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            disabled={isDeleting}
          >
            <Delete2Icon className="w-6" width={ICON_SIZE} height={ICON_SIZE} />
            Delete key
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDialog
        token={token}
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDelete={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
};

ApiListAction.displayName = 'ApiListAction';
