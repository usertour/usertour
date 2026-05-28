'use client';

import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Separator,
  Skeleton,
  SettingsFormSection,
  useSettingsForm,
} from '@usertour/ui';
import { useUpdateUserMutation } from '@usertour/hooks';
import * as z from 'zod';

const profileSchema = z.object({
  name: z.string().min(2).max(30),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Mirrors `ProjectNameFormSkeleton` — single-field form skeleton sized
// to the rendered Save button so the layout doesn't jump after hydration.
const AccountProfileFormSkeleton = () => (
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
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);

export const AccountProfileForm = () => {
  const { userInfo, refetch, loading } = useAppContext();
  const { invoke: updateUser } = useUpdateUserMutation();
  const { t } = useTranslation();

  const state = useSettingsForm<ProfileFormValues>({
    schema: profileSchema,
    defaultValues: { name: userInfo?.name ?? '' },
    submit: async ({ name }) => {
      await updateUser(name);
      await refetch();
    },
    successMessage: t('settings.account.profile.successToast'),
  });

  // Guard on loading because `defaultValues` is captured at mount —
  // rendering before `userInfo` is hydrated would baseline to `''`.
  if (loading) {
    return <AccountProfileFormSkeleton />;
  }

  return (
    <SettingsFormSection
      title={t('settings.account.profile.title')}
      submitLabel={t('settings.common.save')}
      state={state}
    >
      <FormField
        control={state.form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('settings.account.profile.nameLabel')}</FormLabel>
            <FormControl>
              <Input placeholder={t('settings.account.profile.namePlaceholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </SettingsFormSection>
  );
};

AccountProfileForm.displayName = 'AccountProfileForm';
