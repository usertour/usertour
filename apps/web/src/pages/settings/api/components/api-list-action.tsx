import { useState } from 'react';
import { EyeOpenIcon } from '@radix-ui/react-icons';
import { Delete2Icon } from '@usertour/icons';
import {
  type AccessToken,
  useDeleteAccessTokenMutation,
  useGetAccessTokenQuery,
} from '@usertour/hooks';
import { DeleteConfirmDialog, ResourceRowActions } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { useApiContext } from '@/contexts/api-context';
import { useAppContext } from '@/contexts/app-context';
import { ApiKeyDialog } from './api-key-dialog';

interface ApiListActionProps {
  token: AccessToken;
  environmentId: string;
}

export const ApiListAction = ({ token, environmentId }: ApiListActionProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [shouldFetchToken, setShouldFetchToken] = useState(false);
  const { refetch } = useApiContext();
  const { isViewOnly } = useAppContext();
  const { invoke: deleteAccessToken, loading: isDeleting } = useDeleteAccessTokenMutation();
  const { data: fullToken, loading: isTokenLoading } = useGetAccessTokenQuery(
    environmentId,
    token.id,
    { skip: !shouldFetchToken },
  );
  const { toast } = useToast();

  const handleReveal = () => {
    setRevealOpen(true);
    setShouldFetchToken(true);
  };

  const handleDelete = async () => {
    try {
      const success = await deleteAccessToken(environmentId, token.id);
      if (success) {
        toast({ variant: 'success', title: 'API key deleted successfully' });
        setDeleteOpen(false);
        refetch();
      } else {
        toast({ variant: 'destructive', title: 'Failed to delete API key' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete API key' });
    }
  };

  return (
    <>
      <ResourceRowActions
        items={[
          {
            key: 'reveal',
            icon: <EyeOpenIcon className="w-4 h-4 mr-2" />,
            label: 'Reveal API key',
            onSelect: handleReveal,
          },
          {
            key: 'delete',
            icon: <Delete2Icon className="w-4 h-4 mr-2" />,
            label: 'Delete',
            destructive: true,
            disabled: isViewOnly,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
      <DeleteConfirmDialog
        resourceLabel="API key"
        title={
          <>
            Delete API key <span className="font-bold text-foreground">{token.name}</span>
          </>
        }
        description="Are you sure you want to delete this API key? This action cannot be undone."
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
      <ApiKeyDialog
        token={fullToken || ''}
        open={revealOpen}
        onOpenChange={(open) => {
          setRevealOpen(open);
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
