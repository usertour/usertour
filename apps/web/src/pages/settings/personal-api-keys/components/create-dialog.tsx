import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  useToast,
} from '@usertour/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateApiTokenMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { SpinnerIcon } from '@usertour/icons';
import { RevealDialog } from './reveal-dialog';
import {
  TokenFormFields,
  type TokenFormValues,
  tokenFormDefaults,
  tokenFormSchema,
} from './token-form';

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful create — consumers refetch here. */
  onSubmit?: () => void;
}

export const CreateDialog = (props: CreateDialogProps) => {
  const { open, onOpenChange, onSubmit } = props;
  const [newToken, setNewToken] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: tokenFormDefaults,
    mode: 'onChange',
  });

  // The dialog stays mounted, so reset on each open — otherwise a cancelled draft
  // (name / scopes / env selection) would reappear the next time it's opened.
  useEffect(() => {
    if (open) {
      form.reset(tokenFormDefaults);
    }
  }, [open, form]);

  const { invoke: createApiToken, loading: creating } = useCreateApiTokenMutation();

  const handleSubmit = async (values: TokenFormValues) => {
    try {
      const result = await createApiToken({
        name: values.name.trim(),
        projectIds: values.projectIds,
        scopes: values.scopes,
        // Omit when empty → all environments (only valid for non-env-targeted scopes).
        ...(values.environmentIds.length > 0 ? { environmentIds: values.environmentIds } : {}),
      });
      if (!result) {
        toast({ title: t('settings.personalApiKeys.createFailure'), variant: 'destructive' });
        return;
      }
      form.reset(tokenFormDefaults);
      onSubmit?.();
      onOpenChange(false);
      setNewToken(result.token);
      toast({ variant: 'success', title: t('settings.personalApiKeys.createSuccess') });
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
                <DialogTitle>{t('settings.personalApiKeys.createTitle')}</DialogTitle>
              </DialogHeader>
              <TokenFormFields control={form.control} />
              <DialogFooter className="mt-6">
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
                  {creating
                    ? t('settings.personalApiKeys.creating')
                    : t('settings.personalApiKeys.createButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <RevealDialog token={newToken} open={!!newToken} onOpenChange={() => setNewToken('')} />
    </>
  );
};

CreateDialog.displayName = 'CreateDialog';
