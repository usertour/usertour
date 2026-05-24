'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useUpdateEnvironmentMutation } from '@usertour/hooks';
import { Input } from '@usertour/input';
import { Environment } from '@usertour/types';
import { SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { z } from 'zod';

interface EnvironmentEditFormProps {
  isOpen: boolean;
  environment: Environment;
  onClose: () => void;
}

const schema = z.object({
  name: z.string({ required_error: 'Please input your environment name.' }).max(20).min(1),
});

type FormValues = z.infer<typeof schema>;

export const EnvironmentEditForm = ({ environment, isOpen, onClose }: EnvironmentEditFormProps) => {
  const { invoke: updateEnvironment } = useUpdateEnvironmentMutation();
  const { t } = useTranslation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: { name: environment.name },
    submit: async ({ name }) => {
      const success = await updateEnvironment({ id: environment.id, name });
      if (success) {
        onClose();
      }
    },
  });

  // Re-seed the form whenever the dialog re-opens against a different
  // environment record.
  useEffect(() => {
    if (isOpen) {
      state.form.reset({ name: environment.name });
    }
    // intentionally not depending on `state.form` — reset identity is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, environment]);

  return (
    <SettingsDialogForm
      title={t('settings.environments.editTitle')}
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      state={state}
      submitLabel={t('settings.common.submit')}
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

EnvironmentEditForm.displayName = 'EnvironmentEditForm';
