import { Button } from '@usertour/ui';
import { Input } from '@usertour/ui';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@usertour/ui';
import { useCreateAccessTokenMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
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
} from '@usertour/ui';
import { SpinnerIcon } from '@usertour/icons';

interface ApiCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful create — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const formSchema = z.object({
  name: z.string().max(50).min(2),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  name: '',
};

export const ApiCreateDialog = (props: ApiCreateDialogProps) => {
  const { open, onOpenChange, onSubmit } = props;
  const [newToken, setNewToken] = useState('');
  const { environment } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { invoke: createAccessToken, loading: creating } = useCreateAccessTokenMutation();

  const handleSubmit = async (values: FormValues) => {
    if (!environment) {
      toast({
        title: t('settings.api.environmentMissing'),
        variant: 'destructive',
      });
      return;
    }
    try {
      const accessToken = await createAccessToken(environment.id, values.name.trim());
      if (!accessToken) {
        toast({ title: t('settings.api.createFailure'), variant: 'destructive' });
        return;
      }
      setNewToken(accessToken);
      form.reset();
      onSubmit?.(true);
      onOpenChange(false);
      toast({ variant: 'success', title: t('settings.api.createSuccess') });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: 'destructive' });
    }
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
