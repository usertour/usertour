'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useUpdateEmailMutation } from '@usertour/hooks';
import { Input } from '@usertour/input';
import { Separator } from '@usertour/separator';
import { Skeleton } from '@usertour/skeleton';
import { SettingsFormSection, useSettingsForm } from '@usertour/ui';
import * as z from 'zod';

const emailSchema = z.object({
  email: z.string().email().min(3).max(255),
  // Backend re-verifies the current password — schema is just a sanity gate.
  password: z.string().min(1).max(160),
});

type EmailFormValues = z.infer<typeof emailSchema>;

// Two-field equivalent of `AccountProfileFormSkeleton`.
const AccountEmailFormSkeleton = () => (
  <div className="space-y-6">
    <div className="flex h-10 flex-row items-center justify-between">
      <Skeleton className="h-8 w-48" />
    </div>
    <Separator />
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);

export const AccountEmailForm = () => {
  const { userInfo, refetch, loading } = useAppContext();
  const { invoke: updateEmail } = useUpdateEmailMutation();
  const { t } = useTranslation();

  // After a successful email change we want the password field empty
  // again — re-baselining to the just-submitted credential would let a
  // subsequent edit replay it. The ref dodges the "use before init" TS
  // error of self-referencing `state` inside its own `onSuccess`.
  const resetRef = useRef<((email: string) => void) | null>(null);

  const state = useSettingsForm<EmailFormValues>({
    schema: emailSchema,
    defaultValues: { email: userInfo?.email ?? '', password: '' },
    submit: async ({ email, password }) => {
      const success = await updateEmail(email, password);
      if (!success) {
        // useSettingsForm treats non-throw as success — without this
        // guard, a soft-failure response would fire the success toast
        // and clear the password field while the server kept the old
        // email.
        throw new Error(t('settings.account.email.failureToast'));
      }
      await refetch();
    },
    successMessage: t('settings.account.email.successToast'),
    // Opt out of the default re-baseline; we clear `password` explicitly.
    resetOnSuccess: false,
    onSuccess: () => {
      const nextEmail = state.form.getValues('email');
      resetRef.current?.(nextEmail);
    },
  });

  resetRef.current = (email) => state.form.reset({ email, password: '' });

  // Guard on loading: `defaultValues` is captured at mount, so rendering
  // before `userInfo` lands would baseline `email` to `''`.
  if (loading) {
    return <AccountEmailFormSkeleton />;
  }

  return (
    <SettingsFormSection
      title={t('settings.account.email.title')}
      submitLabel={t('settings.common.save')}
      state={state}
    >
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
