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
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour-ui/select';

interface ApiCreateFormProps {
  visible: boolean;
  onClose: () => void;
}

export const ApiCreateForm = ({ visible, onClose }: ApiCreateFormProps) => {
  const [tokenName, setTokenName] = useState('');
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [newToken, setNewToken] = useState('');
  const [_, copyToClipboard] = useCopyToClipboard();
  const { toast } = useToast();
  const { environmentList, loading } = useEnvironmentListContext();

  const [createToken, { loading: creating }] = useMutation(CreateAccessToken, {
    onCompleted: (data) => {
      setNewToken(data.createAccessToken.accessToken);
    },
  });

  const handleCreate = () => {
    if (!tokenName) {
      toast({
        title: 'Error',
        description: 'Please enter a token name',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedEnvironmentId) {
      toast({
        title: 'Error',
        description: 'Please select an environment',
        variant: 'destructive',
      });
      return;
    }

    createToken({
      variables: {
        environmentId: selectedEnvironmentId,
        input: {
          name: tokenName,
        },
      },
    });

    setTokenName('');
    setSelectedEnvironmentId('');
    onClose();
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
            />
            <Select
              value={selectedEnvironmentId}
              onValueChange={setSelectedEnvironmentId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loading ? 'Loading environments...' : 'Select Environment'}
                />
              </SelectTrigger>
              <SelectContent>
                {environmentList?.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {newToken && (
        <Dialog open={!!newToken} onOpenChange={() => setNewToken('')}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Token Created</DialogTitle>
            </DialogHeader>
            <p>Please copy your token now. You won't be able to see it again!</p>
            <Input value={newToken} readOnly />
            <DialogFooter>
              <Button
                onClick={() => {
                  copyToClipboard(newToken);
                  toast({
                    title: 'Token copied to clipboard',
                  });
                }}
              >
                Copy Token
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
