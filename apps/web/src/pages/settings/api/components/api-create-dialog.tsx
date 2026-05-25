import { useMutation } from '@apollo/client';
import { Button } from '@usertour/button';
import { Input } from '@usertour/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/dialog';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@usertour/use-toast';
import { CreateAccessToken } from '@usertour/gql';
import { useAppContext } from '@/contexts/app-context';
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
} from '@usertour/form';
import { SpinnerIcon } from '@usertour/icons';

interface ApiCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful create — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

interface CreateTokenResponse {
  createAccessToken: {
    accessToken: string;
  };
}

const formSchema = z.object({
  name: z.string().max(50).min(2),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const ApiCreateDialog = ({ open, onOpenChange, onSubmit }: ApiCreateDialogProps) => {
  const [newToken, setNewToken] = useState('');
  const { environment } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  const [createToken, { loading: creating }] = useMutation<CreateTokenResponse>(CreateAccessToken, {
    onCompleted: (data) => {
      setNewToken(data.createAccessToken.accessToken);
      form.reset();
      onSubmit?.(true);
      onOpenChange(false);
      toast({
        variant: 'success',
        title: 'API key created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: error.message || 'Failed to create API key',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (values: FormValues) => {
    if (!environment) {
      toast({
        title: 'Environment not found',
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <DialogHeader>
                <DialogTitle>{t('settings.api.createTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.api.createNameLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('settings.api.createNamePlaceholder')} {...field} />
                      </FormControl>
                      <FormDescription>{t('settings.common.changeableLater')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={creating}
                >
                  {t('settings.common.cancel')}
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                  {creating ? t('settings.api.creating') : t('settings.api.createButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ApiKeyDialog
        token={newToken}
        title={t('settings.api.keyDialogCreatedTitle')}
        open={!!newToken}
        onOpenChange={() => setNewToken('')}
      />
    </>
  );
};
