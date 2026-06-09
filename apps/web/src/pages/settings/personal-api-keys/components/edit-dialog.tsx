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
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type ApiToken, useUpdateApiTokenMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { SpinnerIcon } from '@usertour/icons';
import { TokenFormFields, type TokenFormValues, tokenFormSchema } from './token-form';

interface EditDialogProps {
  token: ApiToken;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful update — consumers refetch here. */
  onSuccess?: () => void;
}

export const EditDialog = (props: EditDialogProps) => {
  const { token, open, onOpenChange, onSuccess } = props;
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: {
      name: token.name,
      projectIds: token.projectIds,
      scopes: token.scopes,
    },
    mode: 'onChange',
  });

  // Re-seed the form whenever the dialog opens — the same instance is reused
  // across rows, so stale values would otherwise leak between tokens.
  useEffect(() => {
    if (open) {
      form.reset({ name: token.name, projectIds: token.projectIds, scopes: token.scopes });
    }
  }, [open, token, form]);

  const { invoke: updateApiToken, loading: saving } = useUpdateApiTokenMutation();

  const handleSubmit = async (values: TokenFormValues) => {
    try {
      const result = await updateApiToken(token.id, {
        name: values.name.trim(),
        projectIds: values.projectIds,
        scopes: values.scopes,
      });
      if (!result) {
        toast({ title: t('settings.personalApiKeys.updateFailure'), variant: 'destructive' });
        return;
      }
      onSuccess?.();
      onOpenChange(false);
      toast({ variant: 'success', title: t('settings.personalApiKeys.updateSuccess') });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.personalApiKeys.editTitle')}</DialogTitle>
            </DialogHeader>
            <TokenFormFields control={form.control} />
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {saving
                  ? t('settings.personalApiKeys.saving')
                  : t('settings.personalApiKeys.saveButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

EditDialog.displayName = 'EditDialog';
