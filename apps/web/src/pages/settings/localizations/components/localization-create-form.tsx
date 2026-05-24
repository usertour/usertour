'use client';

import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { useAppContext } from '@/contexts/app-context';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { createLocalization } from '@usertour/gql';
import { Input } from '@usertour/input';
import { type LocateItem, LocateSelect, SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { QuestionTooltip } from '@usertour/tooltip';
import { z } from 'zod';

interface LocalizationCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const schema = z.object({
  locale: z.string({ required_error: 'Please input locale.' }).max(20).min(2),
  name: z.string({ required_error: 'Please input name.' }).max(20).min(2),
  code: z.string({ required_error: 'Please input code.' }).max(20).min(2),
});

type FormValues = z.infer<typeof schema>;

export const LocalizationCreateForm = ({ isOpen, onClose }: LocalizationCreateFormProps) => {
  const [createMutation] = useMutation(createLocalization);
  const { project } = useAppContext();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: { locale: '', name: '', code: '' },
    submit: async (values) => {
      const result = await createMutation({
        variables: { data: { ...values, projectId: project?.id } },
      });
      if (!result.data?.createLocalization?.id) {
        throw new Error('Create Localization failed.');
      }
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      state.form.reset({ locale: '', name: '', code: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleOnSelect = (item: LocateItem) => {
    state.form.setValue('name', `${item.language.name} (${item.country.code})`);
    state.form.setValue('code', item.locale);
    state.form.setValue('locale', item.locale);
  };

  return (
    <SettingsDialogForm
      title="Create New Localization"
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      state={state}
      submitLabel="Create Localization"
      contentClassName="!w-auto"
    >
      <div className="w-[450px] flex flex-col space-y-2">
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

LocalizationCreateForm.displayName = 'LocalizationCreateForm';
