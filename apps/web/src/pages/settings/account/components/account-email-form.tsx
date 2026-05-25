'use client';

import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { updateEmail } from '@usertour/gql';
import { Input } from '@usertour/input';
import { SettingsFormSection, useSettingsForm } from '@usertour/ui';
import * as z from 'zod';

const emailSchema = z.object({
  email: z.string().email().min(3).max(255),
  // Backend re-verifies the current password — schema is just a sanity gate.
  password: z.string().min(1).max(160),
});

type EmailFormValues = z.infer<typeof emailSchema>;

export const AccountEmailForm = () => {
  const { userInfo, refetch } = useAppContext();
  const [updateMutation] = useMutation(updateEmail);
  const { t } = useTranslation();

  const state = useSettingsForm<EmailFormValues>({
    schema: emailSchema,
    defaultValues: { email: userInfo?.email ?? '', password: '' },
    submit: async ({ email, password }) => {
      const result = await updateMutation({ variables: { email, password } });
      if (result.data?.changeEmail?.id) {
        await refetch();
      }
    },
    successMessage: t('settings.account.email.successToast'),
  });

  return (
    <SettingsFormSection title={t('settings.account.email.title')} state={state}>
      <FormField
        control={state.form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.account.email.emailLabel')}</FormLabel>
            <FormControl>
              <Input placeholder={t('settings.account.email.emailPlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={state.form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.account.email.passwordLabel')}</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder={t('settings.account.email.passwordPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </SettingsFormSection>
  );
};

AccountEmailForm.displayName = 'AccountEmailForm';
