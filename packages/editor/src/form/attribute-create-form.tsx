'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CaretSortIcon } from '@radix-ui/react-icons';
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
  displayName: z
    .string({
      required_error: 'Please input display name.',
    })
    .max(20)
    .min(2),
  codeName: z
    .string({
      required_error: 'Please input code name.',
    })
    .max(20)
    .min(2),
  description: z.string({}).max(100),
});

type FormValues = z.infer<typeof formSchema>;

// Picker option metadata for the bizType and dataType DropdownMenus.
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

  useEffect(() => {
    form.reset();
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
        title: 'The attribute has been successfully created',
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
              <DialogTitle>Create New Attribute</DialogTitle>
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
                          Object type
                          <QuestionTooltip className="ml-1">
                            The entity this attribute belongs to: User, Company, Membership, or
                            Event.
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
                                  {selected?.label ?? 'Select an object type'}
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
                                  {option.label}
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
                          Data type
                          <QuestionTooltip className="ml-1">
                            The value type stored in this attribute. Determines serialization and
                            filter operators.
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
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        Display name
                        <QuestionTooltip className="ml-1">
                          Human-friendly name shown across the Usertour dashboard. e.g. "Billing
                          Plan".
                        </QuestionTooltip>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter display name" className="w-72" {...field} />
                      </FormControl>
                      <FormDescription>Can be changed later</FormDescription>
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
                        Code name
                        <QuestionTooltip className="ml-1">
                          Code-friendly identifier used throughout Usertour to reference this
                          attribute. e.g. "billing_plan".
                        </QuestionTooltip>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter code name" className="w-72" {...field} />
                      </FormControl>
                      <FormDescription>Can NOT be changed later</FormDescription>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description" className="w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                Create Attribute
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

AttributeCreateForm.displayName = 'AttributeCreateForm';
