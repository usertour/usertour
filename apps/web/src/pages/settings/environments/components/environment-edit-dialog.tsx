'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  SettingsDialogForm,
  useSettingsForm,
} from '@usertour/ui';
import { useUpdateEnvironmentMutation } from '@usertour/hooks';
import { Environment } from '@usertour/types';
import { z } from 'zod';

interface EnvironmentEditDialogProps {
  environment: Environment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful save — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  name: z.string().max(20).min(1),
});

type FormValues = z.infer<typeof schema>;

export const EnvironmentEditDialog = (props: EnvironmentEditDialogProps) => {
  const { environment, open, onOpenChange, onSubmit } = props;
  const { invoke: updateEnvironment } = useUpdateEnvironmentMutation();
  const { t } = useTranslation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: { name: environment.name },
    submit: async ({ name }) => {
      const success = await updateEnvironment({ id: environment.id, name });
      if (success) {
        onSubmit?.(true);
        onOpenChange(false);
      }
    },
  });

  // Re-seed the form whenever the dialog re-opens against a different
  // environment record.
  useEffect(() => {
    if (open) {
      state.form.reset({ name: environment.name });
    }
    // intentionally not depending on `state.form` — reset identity is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, environment]);

  return (
    <SettingsDialogForm
      title={t('settings.environments.editTitle')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.environments.saveButton')}
      cancelLabel={t('settings.common.cancel')}
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

EnvironmentEditDialog.displayName = 'EnvironmentEditDialog';
