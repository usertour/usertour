'use client';

import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useChangePasswordMutation } from '@usertour/hooks';
import { Input } from '@usertour/input';
import { SettingsFormSection, useSettingsForm } from '@usertour/ui';
import * as z from 'zod';

// Bounds match the auth module's password schema (registration / reset)
// so a password accepted at sign-up can be re-entered as the current
// password here. The mismatch message goes through i18n via the auth
// errors key already used by the sign-up / reset flows.
interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const AccountPasswordForm = () => {
  const { invoke: changePassword } = useChangePasswordMutation();
  const { t } = useTranslation();

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(8).max(160),
          newPassword: z.string().min(8).max(160),
          confirmPassword: z.string().min(8).max(160),
        })
        .refine((values) => values.confirmPassword === values.newPassword, {
          message: t('auth.errors.passwordsDoNotMatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  // The form must clear on success so a stale value can't be replayed.
  // `useRef` lets us reach back into the hook result inside `onSuccess`
  // without TS thinking the local is self-initialising.
  const resetRef = useRef<(() => void) | null>(null);

  const state = useSettingsForm<PasswordFormValues>({
    schema: passwordSchema,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    submit: async ({ newPassword, currentPassword }) => {
      const success = await changePassword(currentPassword, newPassword);
      if (!success) {
        // useSettingsForm treats non-throw as success — without this
        // guard, a soft-failure response (e.g. `{ changePassword: null }`)
        // would fire the success toast and clear the fields while the
        // server still has the old password.
        throw new Error(t('settings.account.password.failureToast'));
      }
    },
    successMessage: t('settings.account.password.successToast'),
    // Opt out of the default re-baseline-to-submitted-values behavior:
    // password fields should clear after a successful change, not retain
    // the just-submitted credentials in form state.
    resetOnSuccess: false,
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
