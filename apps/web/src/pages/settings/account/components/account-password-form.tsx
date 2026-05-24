'use client';

import { useRef } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { changePassword } from '@usertour/gql';
import { Input } from '@usertour/input';
import { SettingsFormSection, useSettingsForm } from '@usertour/ui';
import * as z from 'zod';

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(2, { message: 'Password must be at least 6 characters.' })
      .max(30, { message: 'Password must not be longer than 30 characters.' }),
    newPassword: z
      .string()
      .min(2, { message: 'Password must be at least 6 characters.' })
      .max(30, { message: 'Password must not be longer than 30 characters.' }),
    confirmPassword: z
      .string()
      .min(2, { message: 'Password must be at least 6 characters.' })
      .max(30, { message: 'Password must not be longer than 30 characters.' }),
  })
  .superRefine(({ confirmPassword, newPassword }, ctx) => {
    if (confirmPassword !== newPassword) {
      ctx.addIssue({ code: 'custom', message: 'The passwords did not match' });
    }
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export const AccountPasswordForm = () => {
  const [updateMutation] = useMutation(changePassword);
  const { t } = useTranslation();

  // The form must clear on success so a stale value can't be replayed.
  // `useRef` lets us reach back into the hook result inside `onSuccess`
  // without TS thinking the local is self-initialising.
  const resetRef = useRef<(() => void) | null>(null);

  const state = useSettingsForm<PasswordFormValues>({
    schema: passwordSchema,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    submit: async ({ newPassword, currentPassword }) => {
      await updateMutation({ variables: { newPassword, oldPassword: currentPassword } });
    },
    successMessage: t('settings.account.password.successToast'),
    onSuccess: () => resetRef.current?.(),
  });

  resetRef.current = () => state.form.reset();

  return (
    <SettingsFormSection title={t('settings.account.password.title')} state={state}>
      <FormField
        control={state.form.control}
        name="currentPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.account.password.currentLabel')}</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder={t('settings.account.password.currentPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={state.form.control}
        name="newPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.account.password.newLabel')}</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t('settings.account.password.newPlaceholder')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={state.form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.account.password.confirmLabel')}</FormLabel>
            <FormControl>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t('settings.account.password.confirmPlaceholder')}
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

AccountPasswordForm.displayName = 'AccountPasswordForm';
