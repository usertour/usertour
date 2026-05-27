'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '@usertour/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour/form';
import { CompanyIcon, EventIcon2, SpinnerIcon, UserIcon, UserIcon2 } from '@usertour/icons';
import { Input } from '@usertour/input';
import { CreateAttributeMutationVariables, useCreateAttributeMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { QuestionTooltip } from '@usertour/tooltip';
import { Attribute, AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface CreateFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultValues?: Partial<FormValues>;
  disabledFields?: Array<'dataType' | 'bizType'>;
  zIndex?: number;
  onSuccess?: (attribute: Partial<Attribute>) => void;
}

const formSchema = z.object({
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
  description: z.string({}).max(100),
});

type FormValues = z.infer<typeof formSchema>;

// Picker option metadata for the bizType and dataType DropdownMenus.
// Labels resolve at render time via the shared settings i18n namespace.
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

export const AttributeCreateForm = ({
  onOpenChange,
  isOpen,
  projectId,
  defaultValues: propDefaultValues,
  disabledFields = [],
  zIndex,
  onSuccess,
}: CreateFormProps) => {
  const { invoke } = useCreateAttributeMutation();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const defaultValues: Partial<FormValues> = {
    description: '',
    bizType: String(AttributeBizTypes.User),
    dataType: String(BizAttributeTypes.Number),
    displayName: '',
    codeName: '',
    ...propDefaultValues,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Re-seed with the latest `defaultValues` whenever the dialog opens.
  // `form.reset()` (no arg) would snap back to the values captured at
  // the form's initial mount — wrong for callers that change
  // `propDefaultValues` between opens (e.g. the Attributes settings page
  // defaulting `bizType` to the active tab). `defaultValues` is
  // intentionally not in the dep list: it's recomputed on every parent
  // render (object spread), so listing it would re-reset mid-typing.
  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const data = {
        ...formValues,
        bizType: Number.parseInt(formValues.bizType),
        dataType: Number.parseInt(formValues.dataType),
        projectId,
      } as CreateAttributeMutationVariables;
      const result = await invoke(data);
      if (!result?.id) {
        showError('Create Attribute failed.');
        return;
      }
      onSuccess?.(result);
      toast({
        variant: 'success',
        title: t('settings.attributes.form.createSuccess'),
      });
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" style={{ zIndex: zIndex }} aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.attributes.form.createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-2 mt-4 mb-4">
              <div className="flex flex-row justify-between">
                <FormField
                  control={form.control}
                  name="bizType"
                  render={({ field }) => {
                    const selected = BIZ_TYPE_OPTIONS.find(
                      (option) => option.value === field.value,
                    );
                    const isDisabled = disabledFields.includes('bizType');
                    return (
                      <FormItem>
                        <FormLabel className="flex flex-row">
                          {t('settings.attributes.form.bizTypeLabel')}
                          <QuestionTooltip className="ml-1">
                            {t('settings.attributes.form.bizTypeTooltip')}
                          </QuestionTooltip>
                        </FormLabel>
                        {/* modal={false}: outer Dialog already traps focus,
                            so the dropdown skips its own trap and avoids
                            cascading aria-hidden onto its focused trigger. */}
                        <DropdownMenu modal={false}>
                          <FormControl>
                            <DropdownMenuTrigger asChild disabled={isDisabled}>
                              <Button
                                type="button"
                                variant="outline"
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
                            </DropdownMenuTrigger>
                          </FormControl>
                          <DropdownMenuContent align="start" className="w-72">
                            {BIZ_TYPE_OPTIONS.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                onSelect={() => field.onChange(option.value)}
                              >
                                <span className="flex items-center gap-1">
                                  {option.icon}
                                  {t(option.labelKey)}
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="dataType"
                  render={({ field }) => {
                    const selected = DATA_TYPE_OPTIONS.find(
                      (option) => option.value === field.value,
                    );
                    const isDisabled = disabledFields.includes('dataType');
                    return (
                      <FormItem>
                        <FormLabel className="flex flex-row">
                          {t('settings.attributes.form.dataTypeLabel')}
                          <QuestionTooltip className="ml-1">
                            {t('settings.attributes.form.dataTypeTooltip')}
                          </QuestionTooltip>
                        </FormLabel>
                        <DropdownMenu modal={false}>
                          <FormControl>
                            <DropdownMenuTrigger asChild disabled={isDisabled}>
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
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        {t('settings.attributes.form.displayNameLabel')}
                        <QuestionTooltip className="ml-1">
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
                      <FormDescription>{t('settings.common.changeableLater')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="codeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        {t('settings.attributes.form.codeNameLabel')}
                        <QuestionTooltip className="ml-1">
                          {t('settings.attributes.form.codeNameTooltip')}
                        </QuestionTooltip>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('settings.attributes.form.codeNamePlaceholder')}
                          className="w-72"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>{t('settings.common.notChangeableLater')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
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
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t('settings.common.cancel')}</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.attributes.form.createSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

AttributeCreateForm.displayName = 'AttributeCreateForm';
