import { useApiContext } from '@/contexts/api-context';
import {
  AccessToken,
  useDeleteAccessTokenMutation,
  useGetAccessTokenQuery,
} from '@usertour-ui/shared-hooks';
import { DotsHorizontalIcon, EyeOpenIcon } from '@radix-ui/react-icons';
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
import { ApiKeyDialog } from './api-key-dialog';

// Type definitions
type ApiListActionProps = {
  token: AccessToken;
  environmentId: string;
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
export const ApiListAction = ({ token, environmentId }: ApiListActionProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRevealDialogOpen, setIsRevealDialogOpen] = useState(false);
  const [shouldFetchToken, setShouldFetchToken] = useState(false);
  const { refetch } = useApiContext();
  const { isViewOnly } = useAppContext();
  const { invoke: deleteAccessToken, loading: isDeleting } = useDeleteAccessTokenMutation();
  const { data: fullToken, loading: isTokenLoading } = useGetAccessTokenQuery(
    environmentId,
    token.id,
    {
      skip: !shouldFetchToken,
    },
  );
  const { toast } = useToast();

  const handleReveal = () => {
    setIsRevealDialogOpen(true);
    setShouldFetchToken(true);
  };

  const handleDelete = async () => {
    try {
      const success = await deleteAccessToken(environmentId, token.id);
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
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={handleReveal}>
            <EyeOpenIcon className="w-4 h-4 mr-2" />
            Reveal API key
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isViewOnly}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Delete2Icon className="w-4 h-4 mr-2" />
            Delete
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
      <ApiKeyDialog
        token={fullToken || ''}
        open={isRevealDialogOpen}
        onOpenChange={(open) => {
          setIsRevealDialogOpen(open);
          if (!open) {
            setShouldFetchToken(false);
          }
        }}
        description={isTokenLoading ? 'Loading...' : undefined}
      />
    </>
  );
};

ApiListAction.displayName = 'ApiListAction';
