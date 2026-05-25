'use client';

import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { updateLocalization } from '@usertour/gql';
import { Input } from '@usertour/input';
import { type LocateItem, LocateSelect, SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { QuestionTooltip } from '@usertour/tooltip';
import { Localization } from '@usertour/types';
import { z } from 'zod';

interface LocalizationEditDialogProps {
  isOpen: boolean;
  localization: Localization;
  onClose: () => void;
}

const schema = z.object({
  locale: z.string().max(20).min(2),
  name: z.string().max(20).min(2),
  code: z.string().max(20).min(2),
});

type FormValues = z.infer<typeof schema>;

const toFormValues = (localization: Localization): FormValues => ({
  locale: localization.locale,
  name: localization.name,
  code: localization.code,
});

export const LocalizationEditDialog = ({
  isOpen,
  localization,
  onClose,
}: LocalizationEditDialogProps) => {
  const [updateMutation] = useMutation(updateLocalization);
  const { t } = useTranslation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: toFormValues(localization),
    submit: async (values) => {
      const result = await updateMutation({
        variables: { data: { id: localization.id, ...values } },
      });
      if (!result.data?.updateLocalization?.id) {
        throw new Error('Update localization failed.');
      }
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      state.form.reset(toFormValues(localization));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, localization]);

  return (
    <SettingsDialogForm
      title={t('settings.localizations.editTitle')}
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      state={state}
      submitLabel={t('settings.localizations.saveButton')}
      contentClassName="max-w-2xl"
    >
      <div className="flex flex-col space-y-2">
        <FormField
          control={state.form.control}
          name="locale"
          render={() => (
            <FormItem>
              <FormLabel className="flex flex-row items-center">
                {t('settings.localizations.form.localeLabel')}
                <QuestionTooltip className="ml-1">
                  {t('settings.localizations.form.localeTooltip')}
                </QuestionTooltip>
              </FormLabel>
              <LocateSelect
                popperContentClass="w-[450px]"
                defaultValue={state.form.getValues('locale')}
                onSelect={(item: LocateItem) => {
                  state.form.setValue('name', `${item.language.name} (${item.country.code})`);
                  state.form.setValue('code', item.locale);
                  state.form.setValue('locale', item.locale);
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={state.form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex flex-row items-center">
                {t('settings.localizations.form.nameLabel')}
                <QuestionTooltip className="ml-1">
                  {t('settings.localizations.form.nameTooltip')}
                </QuestionTooltip>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('settings.localizations.form.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={state.form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex flex-row items-center">
                {t('settings.localizations.form.codeLabel')}
                <QuestionTooltip className="ml-1">
                  {t('settings.localizations.form.codeTooltip')}
                </QuestionTooltip>
              </FormLabel>
              <FormControl>
                <Input placeholder={t('settings.localizations.form.codePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SettingsDialogForm>
  );
};

LocalizationEditDialog.displayName = 'LocalizationEditDialog';
