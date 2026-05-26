'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useCreateLocalizationMutation } from '@usertour/hooks';
import { Input } from '@usertour/input';
import { type LocateItem, LocateSelect, SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { QuestionTooltip } from '@usertour/tooltip';
import { z } from 'zod';

interface LocalizationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful create — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  locale: z.string().max(20).min(2),
  name: z.string().max(20).min(2),
  code: z.string().max(20).min(2),
});

type FormValues = z.infer<typeof schema>;

export const LocalizationCreateDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: LocalizationCreateDialogProps) => {
  const { invoke: createLocalization } = useCreateLocalizationMutation();
  const { project } = useAppContext();
  const { t } = useTranslation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: { locale: '', name: '', code: '' },
    submit: async (values) => {
      const success = await createLocalization({ ...values, projectId: project?.id ?? '' });
      if (!success) {
        throw new Error(t('settings.localizations.createFailure'));
      }
      onSubmit?.(true);
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      state.form.reset({ locale: '', name: '', code: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOnSelect = (item: LocateItem) => {
    state.form.setValue('name', `${item.language.name} (${item.country.code})`);
    state.form.setValue('code', item.locale);
    state.form.setValue('locale', item.locale);
  };

  return (
    <SettingsDialogForm
      title={t('settings.localizations.createTitle')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.localizations.createButton')}
      cancelLabel={t('settings.common.cancel')}
      contentClassName="!w-auto"
    >
      <div className="w-[450px] flex flex-col space-y-2">
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
              <LocateSelect popperContentClass="w-[450px]" onSelect={handleOnSelect} />
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

LocalizationCreateDialog.displayName = 'LocalizationCreateDialog';
