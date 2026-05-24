'use client';

import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { updateLocalization } from '@usertour/gql';
import { Input } from '@usertour/input';
import { type LocateItem, LocateSelect, SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { QuestionTooltip } from '@usertour/tooltip';
import { Localization } from '@usertour/types';
import { z } from 'zod';

interface LocalizationEditFormProps {
  isOpen: boolean;
  localization: Localization;
  onClose: () => void;
}

const schema = z.object({
  locale: z.string({ required_error: 'Please input locale.' }).max(20).min(2),
  name: z.string({ required_error: 'Please input name.' }).max(20).min(2),
  code: z.string({ required_error: 'Please input code.' }).max(20).min(2),
});

type FormValues = z.infer<typeof schema>;

const toFormValues = (localization: Localization): FormValues => ({
  locale: localization.locale,
  name: localization.name,
  code: localization.code,
});

export const LocalizationEditForm = ({
  isOpen,
  localization,
  onClose,
}: LocalizationEditFormProps) => {
  const [updateMutation] = useMutation(updateLocalization);

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
      title="Rename Localization"
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      state={state}
      submitLabel="Save Localization"
      contentClassName="max-w-2xl"
    >
      <div className="flex flex-col space-y-2">
        <FormField
          control={state.form.control}
          name="locale"
          render={() => (
            <FormItem>
              <FormLabel className="flex flex-row items-center">
                Locale
                <QuestionTooltip className="ml-1">
                  A locale represents a user's language and region.
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
                Name
                <QuestionTooltip className="ml-1">
                  Human-readable name of the locale
                </QuestionTooltip>
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter display name" {...field} />
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
                Code
                <QuestionTooltip className="ml-1">
                  The value that users of this locale must have in their locale_code attribute in
                  your Usertour.js installation. It's important that this code matches exactly. If a
                  user has a missing or invalid locale code, they will be regarded as having no
                  locale, which means they'll see the flow in the base locale.
                </QuestionTooltip>
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter code name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SettingsDialogForm>
  );
};

LocalizationEditForm.displayName = 'LocalizationEditForm';
