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
import { CreateAccessToken } from '@usertour-ui/gql';
import { useAppContext } from '@/contexts/app-context';
import { useApiContext } from '@/contexts/api-context';
import { ApiKeyDialog } from './api-key-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-ui/form';
import { Icons } from '@/components/atoms/icons';

interface ApiCreateFormProps {
  visible: boolean;
  onClose: () => void;
}

interface CreateTokenResponse {
  createAccessToken: {
    accessToken: string;
  };
}

const formSchema = z.object({
  name: z
    .string({
      required_error: 'Please input token name.',
    })
    .max(50)
    .min(2),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const ApiCreateForm = ({ visible, onClose }: ApiCreateFormProps) => {
  const [newToken, setNewToken] = useState('');
  const { environment } = useAppContext();
  const { refetch } = useApiContext();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  const [createToken, { loading: creating }] = useMutation<CreateTokenResponse>(CreateAccessToken, {
    onCompleted: async (data) => {
      setNewToken(data.createAccessToken.accessToken);
      form.reset();
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

  const onSubmit = async (values: FormValues) => {
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
          name: values.name.trim(),
        },
      },
    });
  };

  return (
    <>
      <Dialog open={visible} onOpenChange={onClose}>
        <DialogContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>New API key</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter key name" {...field} />
                      </FormControl>
                      <FormDescription>Can be changed later</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={onClose} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ApiKeyDialog
        token={newToken}
        title="New API key Created"
        open={!!newToken}
        onOpenChange={() => setNewToken('')}
      />
    </>
  );
};
