'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentLimit } from '@/hooks/use-plan-limits';
import { Alert, AlertDescription, AlertTitle } from '@usertour/alert';
import { Button } from '@usertour/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/dialog';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useCreateEnvironmentMutation } from '@usertour/hooks';
import { Input } from '@usertour/input';
import { SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { z } from 'zod';

interface EnvironmentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful create — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  name: z.string().max(20).min(1),
});

type FormValues = z.infer<typeof schema>;

export const EnvironmentCreateDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: EnvironmentCreateDialogProps) => {
  const { invoke: createEnvironment } = useCreateEnvironmentMutation();
  const { project } = useAppContext();
  const navigate = useNavigate();
  const { canUseMore } = useEnvironmentLimit();
  const { t } = useTranslation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: { name: '' },
    submit: async ({ name }) => {
      if (!project?.id) {
        return;
      }
      const id = await createEnvironment({ name, projectId: project.id });
      if (id) {
        onSubmit?.(true);
        onOpenChange(false);
      }
    },
  });

  // The dialog can be reopened back-to-back; reset to defaults each open
  // so a previous create attempt doesn't seed the next one.
  useEffect(() => {
    if (open) {
      state.form.reset({ name: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!canUseMore) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('settings.environments.createTitle')}</DialogTitle>
          </DialogHeader>
          <Alert className="bg-primary/10 border-primary/5">
            <AlertCircle className="h-4 w-4 !text-primary" />
            <AlertTitle>{t('settings.environments.limitTitle')}</AlertTitle>
            <AlertDescription>
              {t('settings.environments.limitDescriptionPrefix')}
              <Button
                variant="link"
                className="p-0 h-auto font-normal inline"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/project/${project?.id}/settings/billing`);
                }}
              >
                {t('settings.environments.upgradeLink')}
              </Button>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate(`/project/${project?.id}/settings/billing`);
              }}
            >
              {t('settings.environments.upgrade')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <SettingsDialogForm
      title={t('settings.environments.createTitle')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.common.submit')}
      cancelLabel={t('settings.common.cancel')}
      contentClassName="max-w-xl"
    >
      <FormField
        control={state.form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.environments.nameLabel')}</FormLabel>
            <FormControl>
              <Input placeholder={t('settings.environments.namePlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </SettingsDialogForm>
  );
};

EnvironmentCreateDialog.displayName = 'EnvironmentCreateDialog';
