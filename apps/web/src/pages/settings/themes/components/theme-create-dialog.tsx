'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/contexts/app-context';
import { Checkbox } from '@usertour/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useCreateThemeMutation } from '@usertour/hooks';
import { Input } from '@usertour/input';
import { SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { defaultSettings } from '@usertour/types';
import { z } from 'zod';

interface ThemeCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful create — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  name: z.string().max(30).min(1),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  name: '',
  isDefault: false,
};

export const ThemeCreateDialog = ({ open, onOpenChange, onSubmit }: ThemeCreateDialogProps) => {
  const { t } = useTranslation();
  const { project } = useAppContext();
  const { invoke: createTheme } = useCreateThemeMutation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues,
    submit: async (values) => {
      if (!project?.id) {
        throw new Error(t('themes.createForm.toast.projectMissing'));
      }
      const success = await createTheme({
        ...values,
        projectId: project.id,
        settings: defaultSettings,
      });
      if (!success) {
        throw new Error(t('themes.createForm.toast.createFailed'));
      }
      onSubmit?.(true);
      onOpenChange(false);
    },
    successMessage: t('themes.createForm.toast.success'),
  });

  useEffect(() => {
    if (open) {
      state.form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <SettingsDialogForm
      title={t('themes.createForm.title')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('themes.createForm.submit')}
      cancelLabel={t('themes.createForm.cancel')}
    >
      <div className="space-y-4">
        <FormField
          control={state.form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('themes.createForm.name.label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('themes.createForm.name.placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={state.form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="leading-none">
                <FormLabel>{t('themes.createForm.isDefault.label')}</FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SettingsDialogForm>
  );
};

ThemeCreateDialog.displayName = 'ThemeCreateDialog';
