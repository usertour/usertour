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
  type LocateItem,
  LocateSelect,
  SettingsDialogForm,
  useSettingsForm,
  QuestionTooltip,
} from '@usertour/ui';
import { useUpdateLocalizationMutation } from '@usertour/hooks';
import { Localization } from '@usertour/types';
import { z } from 'zod';

interface LocalizationEditDialogProps {
  localization: Localization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful save — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  // BCP-47 tags can stack subtags; 35 is the spec's recommended buffer.
  locale: z.string().max(35).min(2),
  // Must fit the longest official locale display names the picker
  // auto-fills (e.g. "Chinese (Simplified, People's Republic of China)").
  name: z.string().max(64).min(2),
  code: z.string().max(35).min(2),
});

type FormValues = z.infer<typeof schema>;

const toFormValues = (localization: Localization): FormValues => ({
  locale: localization.locale,
  name: localization.name,
  code: localization.code,
});

export const LocalizationEditDialog = (props: LocalizationEditDialogProps) => {
  const { localization, open, onOpenChange, onSubmit } = props;
  const { invoke: updateLocalization } = useUpdateLocalizationMutation();
  const { t } = useTranslation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: toFormValues(localization),
    submit: async (values) => {
      const success = await updateLocalization({ id: localization.id, ...values });
      if (!success) {
        throw new Error(t('settings.localizations.updateFailure'));
      }
      onSubmit?.(true);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      state.form.reset(toFormValues(localization));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, localization]);

  return (
    <SettingsDialogForm
      title={t('settings.localizations.editTitle')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.localizations.saveButton')}
      cancelLabel={t('settings.common.cancel')}
      contentClassName="max-w-xl"
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
                popperContentClass="w-[var(--radix-popover-trigger-width)]"
                defaultValue={state.form.getValues('locale')}
                triggerPlaceholder={t('common.locale.triggerPlaceholder')}
                searchPlaceholder={t('common.locale.searchPlaceholder')}
                emptyMessage={t('common.locale.empty')}
                groupHeading={t('common.locale.groupHeading')}
                onSelect={(item: LocateItem) => {
                  state.form.setValue('name', item.name);
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
