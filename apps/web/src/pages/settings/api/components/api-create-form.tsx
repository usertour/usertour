import { useMutation } from '@apollo/client';
import { Button } from '@usertour-ui/button';
import { Input } from '@usertour-ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import { useState } from 'react';
import { useToast } from '@usertour-ui/use-toast';
import { useCopyToClipboard } from 'react-use';
import { CreateAccessToken } from '@usertour-ui/gql';
import { useAppContext } from '@/contexts/app-context';

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
  const [_, copyToClipboard] = useCopyToClipboard();
  const { environment } = useAppContext();
  const { toast } = useToast();

  const [createToken, { loading: creating }] = useMutation<CreateTokenResponse>(CreateAccessToken, {
    onCompleted: (data) => {
      setNewToken(data.createAccessToken.accessToken);
      setTokenName('');
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create token',
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

  const handleCopyToken = () => {
    copyToClipboard(newToken);
    toast({
      title: 'Success',
      description: 'Token copied to clipboard',
    });
  };

  return (
    <>
      <Dialog open={visible} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Token</DialogTitle>
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
            <DialogTitle>New Token Created</DialogTitle>
          </DialogHeader>
          <p className="mb-4 text-sm text-gray-600">
            Please copy your token now. You won't be able to see it again!
          </p>
          <Input value={newToken} readOnly className="mb-4" />
          <DialogFooter>
            <Button onClick={handleCopyToken}>Copy Token</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
