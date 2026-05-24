'use client';

import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { updateUser } from '@usertour/gql';
import { Input } from '@usertour/input';
import { SettingsFormSection, useSettingsForm } from '@usertour/ui';
import * as z from 'zod';

const profileSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(30, { message: 'Name must not be longer than 30 characters.' }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const AccountProfileForm = () => {
  const { userInfo, refetch } = useAppContext();
  const [updateMutation] = useMutation(updateUser);
  const { t } = useTranslation();

  const state = useSettingsForm<ProfileFormValues>({
    schema: profileSchema,
    defaultValues: { name: userInfo?.name ?? '' },
    submit: async ({ name }) => {
      await updateMutation({ variables: { name, avatarUrl: '' } });
      await refetch();
    },
    successMessage: t('settings.account.profile.successToast'),
  });

  return (
    <SettingsFormSection title={t('settings.account.profile.title')} state={state}>
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
