import { useMutation } from '@apollo/client';
import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { useState } from 'react';
import { useToast } from '@usertour-ui/use-toast';
import { CreateAccessToken } from '@usertour-ui/gql';
import { useAppContext } from '@/contexts/app-context';
import { useApiContext } from '@/contexts/api-context';
import { ApiListAction } from './api-list-action';

interface ApiCreateFormProps {
  visible: boolean;
  onClose: () => void;
}

interface CreateTokenResponse {
  createAccessToken: {
    accessToken: string;
  };
}

export const ApiCreateForm = ({ visible, onClose }: ApiCreateFormProps) => {
  const [tokenName, setTokenName] = useState('');
  const [newToken, setNewToken] = useState('');
  const { environment } = useAppContext();
  const { refetch } = useApiContext();
  const { toast } = useToast();

  const [createToken, { loading: creating }] = useMutation<CreateTokenResponse>(CreateAccessToken, {
    onCompleted: async (data) => {
      setNewToken(data.createAccessToken.accessToken);
      setTokenName('');
      onClose();
      await refetch();
      toast({
        title: 'Success',
        description: 'API key created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create API key',
        variant: 'destructive',
      });
    },
  });

  const validateForm = (): boolean => {
    if (!tokenName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a token name',
        variant: 'destructive',
      });
      return false;
    }

    if (!environment) {
      toast({
        title: 'Error',
        description: 'Please select an environment',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleCreate = () => {
    if (!validateForm()) return;

    if (!environment) {
      toast({
        title: 'Error',
        description: 'Environment not found',
        variant: 'destructive',
      });
      return;
    }

    createToken({
      variables: {
        environmentId: environment.id,
        input: {
          name: tokenName.trim(),
        },
      },
    });
  };

  return (
    <>
      <Dialog open={visible} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Token Name"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              disabled={creating}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newToken} onOpenChange={() => setNewToken('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API key Created</DialogTitle>
          </DialogHeader>
          <div>Please copy your API key now.</div>
          <div className="flex flex-col ">
            <span>API key</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">{newToken}</span>
              <ApiListAction token={newToken} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
