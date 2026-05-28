'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretSortIcon } from '@radix-ui/react-icons';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  QuestionTooltip,
  SettingsDialogForm,
  useSettingsForm,
} from '@usertour/ui';
import { useUpdateAttributeMutation } from '@usertour/hooks';
import { CompanyIcon, EventIcon2, UserIcon, UserIcon2 } from '@usertour/icons';
import { type Attribute, AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { z } from 'zod';

interface AttributeEditDialogProps {
  attribute: Attribute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful save — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  dataType: z.enum([
    String(BizAttributeTypes.Number),
    String(BizAttributeTypes.String),
    String(BizAttributeTypes.Boolean),
    String(BizAttributeTypes.DateTime),
    String(BizAttributeTypes.List),
  ]),
  bizType: z.enum([
    String(AttributeBizTypes.User),
    String(AttributeBizTypes.Company),
    String(AttributeBizTypes.Membership),
    String(AttributeBizTypes.Event),
  ]),
  displayName: z.string().max(20).min(2),
  codeName: z.string().max(20).min(2),
  description: z.string().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

// Option metadata for the locked Object type display + the editable
// Data type dropdown. Labels resolve at render time via i18n.
const BIZ_TYPE_OPTIONS = [
  {
    value: String(AttributeBizTypes.User),
    labelKey: 'settings.attributes.form.bizTypes.user',
    icon: <UserIcon width={16} height={16} />,
  },
  {
    value: String(AttributeBizTypes.Company),
    labelKey: 'settings.attributes.form.bizTypes.company',
    icon: <CompanyIcon width={16} height={16} />,
  },
  {
    value: String(AttributeBizTypes.Membership),
    labelKey: 'settings.attributes.form.bizTypes.membership',
    icon: <UserIcon2 width={16} height={16} />,
  },
  {
    value: String(AttributeBizTypes.Event),
    labelKey: 'settings.attributes.form.bizTypes.event',
    icon: <EventIcon2 width={16} height={16} />,
  },
] as const;

const DATA_TYPE_OPTIONS = [
  {
    value: String(BizAttributeTypes.Number),
    labelKey: 'settings.attributes.form.dataTypes.number',
  },
  {
    value: String(BizAttributeTypes.String),
    labelKey: 'settings.attributes.form.dataTypes.string',
  },
  {
    value: String(BizAttributeTypes.Boolean),
    labelKey: 'settings.attributes.form.dataTypes.boolean',
  },
  {
    value: String(BizAttributeTypes.DateTime),
    labelKey: 'settings.attributes.form.dataTypes.dateTime',
  },
  { value: String(BizAttributeTypes.List), labelKey: 'settings.attributes.form.dataTypes.list' },
] as const;

const toFormValues = (attribute: Attribute): FormValues => ({
  bizType: String(attribute.bizType) as FormValues['bizType'],
  dataType: String(attribute.dataType) as FormValues['dataType'],
  displayName: attribute.displayName,
  codeName: attribute.codeName,
  description: attribute.description ?? '',
});

export const AttributeEditDialog = (props: AttributeEditDialogProps) => {
  const { attribute, open, onOpenChange, onSubmit } = props;
  const { invoke: updateAttribute } = useUpdateAttributeMutation();
  const { t } = useTranslation();

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: toFormValues(attribute),
    submit: async (values) => {
      const success = await updateAttribute({
        id: attribute.id,
        bizType: Number.parseInt(values.bizType, 10),
        dataType: Number.parseInt(values.dataType, 10),
        codeName: values.codeName,
        displayName: values.displayName,
        description: values.description,
      });
      if (!success) {
        throw new Error(t('settings.attributes.updateFailure'));
      }
      onSubmit?.(true);
      onOpenChange(false);
    },
    successMessage: t('settings.attributes.updateSuccess'),
  });

  useEffect(() => {
    if (open) {
      state.form.reset(toFormValues(attribute));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attribute]);

  return (
    <SettingsDialogForm
      title={t('settings.attributes.editTitle')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.attributes.saveButton')}
      cancelLabel={t('settings.common.cancel')}
      contentClassName="max-w-2xl"
    >
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between">
          <FormField
            control={state.form.control}
            name="bizType"
            render={({ field }) => {
              const selected = BIZ_TYPE_OPTIONS.find((option) => option.value === field.value);
              // Object type is locked once the attribute exists — show it
              // as a disabled trigger that never opens a menu.
              return (
                <FormItem>
                  <FormLabel className="flex flex-row">
                    {t('settings.attributes.form.bizTypeLabel')}
                    <QuestionTooltip className="inline ml-1">
                      {t('settings.attributes.form.bizTypeTooltip')}
                    </QuestionTooltip>
                  </FormLabel>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      className="w-72 justify-between font-normal"
                    >
                      <span className="flex items-center gap-1">
                        {selected?.icon}
                        {selected
                          ? t(selected.labelKey)
                          : t('settings.attributes.form.bizTypePlaceholder')}
                      </span>
                      <CaretSortIcon className="h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={state.form.control}
            name="dataType"
            render={({ field }) => {
              const selected = DATA_TYPE_OPTIONS.find((option) => option.value === field.value);
              return (
                <FormItem>
                  <FormLabel className="flex flex-row">
                    {t('settings.attributes.form.dataTypeLabel')}
                    <QuestionTooltip className="inline ml-1">
                      {t('settings.attributes.form.dataTypeTooltip')}
                    </QuestionTooltip>
                  </FormLabel>
                  {/* modal={false}: outer Dialog already provides the
                      focus trap, so the dropdown skips its own — avoids
                      cascading aria-hidden onto the (still-focused)
                      trigger button. */}
                  <DropdownMenu modal={false}>
                    <FormControl>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-72 justify-between font-normal"
                        >
                          {selected
                            ? t(selected.labelKey)
                            : t('settings.attributes.form.dataTypePlaceholder')}
                          <CaretSortIcon className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                    </FormControl>
                    <DropdownMenuContent align="start" className="w-72">
                      {DATA_TYPE_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={() => field.onChange(option.value)}
                        >
                          {t(option.labelKey)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
        <div className="flex flex-row justify-between">
          <FormField
            control={state.form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex flex-row">
                  {t('settings.attributes.form.displayNameLabel')}
                  <QuestionTooltip className="inline ml-1">
                    {t('settings.attributes.form.displayNameTooltip')}
                  </QuestionTooltip>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('settings.attributes.form.displayNamePlaceholder')}
                    className="w-72"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={state.form.control}
            name="codeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex flex-row">
                  {t('settings.attributes.form.codeNameLabel')}
                  <QuestionTooltip className="inline ml-1">
                    {t('settings.attributes.form.codeNameTooltip')}
                  </QuestionTooltip>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('settings.attributes.form.codeNamePlaceholder')}
                    className="w-72"
                    disabled
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={state.form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.common.description')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('settings.common.descriptionPlaceholder')}
                  className="w-full"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SettingsDialogForm>
  );
};

AttributeEditDialog.displayName = 'AttributeEditDialog';
