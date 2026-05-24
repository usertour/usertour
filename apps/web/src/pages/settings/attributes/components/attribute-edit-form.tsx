'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@usertour/form';
import { useUpdateAttributeMutation } from '@usertour/hooks';
import { CompanyIcon, EventIcon2, UserIcon, UserIcon2 } from '@usertour/icons';
import { Input } from '@usertour/input';
import { QuestionTooltip } from '@usertour/tooltip';
import { type Attribute, AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { z } from 'zod';

interface AttributeEditFormProps {
  isOpen: boolean;
  attribute: Attribute;
  onClose: () => void;
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
  displayName: z.string({ required_error: 'Please input display name.' }).max(20).min(2),
  codeName: z.string({ required_error: 'Please input code name.' }).max(20).min(2),
  description: z.string().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

// Option metadata for the locked Object type display + the editable
// Data type dropdown. Kept inline so the JSX below stays readable.
const BIZ_TYPE_OPTIONS = [
  {
    value: String(AttributeBizTypes.User),
    label: 'User',
    icon: <UserIcon width={16} height={16} />,
  },
  {
    value: String(AttributeBizTypes.Company),
    label: 'Company',
    icon: <CompanyIcon width={16} height={16} />,
  },
  {
    value: String(AttributeBizTypes.Membership),
    label: 'Company Membership',
    icon: <UserIcon2 width={16} height={16} />,
  },
  {
    value: String(AttributeBizTypes.Event),
    label: 'Event',
    icon: <EventIcon2 width={16} height={16} />,
  },
] as const;

const DATA_TYPE_OPTIONS = [
  { value: String(BizAttributeTypes.Number), label: 'Number' },
  { value: String(BizAttributeTypes.String), label: 'String' },
  { value: String(BizAttributeTypes.Boolean), label: 'Boolean' },
  { value: String(BizAttributeTypes.DateTime), label: 'DateTime' },
  { value: String(BizAttributeTypes.List), label: 'List' },
] as const;

const toFormValues = (attribute: Attribute): FormValues => ({
  bizType: String(attribute.bizType) as FormValues['bizType'],
  dataType: String(attribute.dataType) as FormValues['dataType'],
  displayName: attribute.displayName,
  codeName: attribute.codeName,
  description: attribute.description ?? '',
});

export const AttributeEditForm = ({ attribute, isOpen, onClose }: AttributeEditFormProps) => {
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
        throw new Error('Update attribute failed.');
      }
      onClose();
    },
    successMessage: t('settings.attributes.updateSuccess'),
  });

  useEffect(() => {
    if (isOpen) {
      state.form.reset(toFormValues(attribute));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, attribute]);

  return (
    <SettingsDialogForm
      title={t('settings.attributes.editTitle')}
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      state={state}
      submitLabel={t('settings.attributes.saveButton')}
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
                    Object type
                    <QuestionTooltip className="inline ml-1">
                      The entity this attribute belongs to: User, Company, Membership, or Event.
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
                        {selected?.label ?? 'Select an object type'}
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
                    Data type
                    <QuestionTooltip className="inline ml-1">
                      The value type stored in this attribute. Determines serialization and filter
                      operators.
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
                          {selected?.label ?? 'Select a data type'}
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
                          {option.label}
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
                  Display name
                  <QuestionTooltip className="inline ml-1">
                    Human-friendly name shown across the Usertour dashboard. e.g. "Billing Plan".
                  </QuestionTooltip>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter display name" className="w-72" {...field} />
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
                  Code name
                  <QuestionTooltip className="inline ml-1">
                    Code-friendly identifier used throughout Usertour to reference this attribute.
                    e.g. "billing_plan".
                  </QuestionTooltip>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter code name" className="w-72" disabled {...field} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Optional description" className="w-full" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SettingsDialogForm>
  );
};

AttributeEditForm.displayName = 'AttributeEditForm';
