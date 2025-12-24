'use client';

import { SpinnerIcon } from '@usertour-packages/icons';
import { Attribute } from '@usertour/types';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { updateAttribute } from '@usertour-packages/gql';
import { CompanyIcon, EventIcon2, UserIcon, UserIcon2 } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { getErrorMessage } from '@usertour/helpers';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface EditFormProps {
  isOpen: boolean;
  attribute: Attribute;
  onClose: () => void;
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
  description: z.string().min(0).max(100),
});

type FormValues = z.infer<typeof formSchema>;

export const AttributeEditForm = (props: EditFormProps) => {
  const { onClose, isOpen, attribute } = props;
  const [updateMutation] = useMutation(updateAttribute);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...attribute,
      bizType: String(attribute.bizType),
      dataType: String(attribute.dataType),
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({
      ...attribute,
      bizType: String(attribute.bizType),
      dataType: String(attribute.dataType),
    });
  }, [isOpen, attribute, form]);

  const handleOnSubmit = React.useCallback(
    async (formValues: FormValues) => {
      setIsLoading(true);
      try {
        const data = {
          id: attribute.id,
          bizType: Number.parseInt(formValues.bizType),
          dataType: Number.parseInt(formValues.dataType),
          codeName: formValues.codeName,
          displayName: formValues.displayName,
          description: formValues.description,
        };
        const ret = await updateMutation({ variables: { data } });

        if (!ret.data?.updateAttribute?.id) {
          showError('Update attribute failed.');
        }
        onClose();
      } catch (error) {
        showError(getErrorMessage(error));
      }
      setIsLoading(false);
    },
    [attribute],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Rename Attribute </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col space-y-2 mt-4 mb-4">
              <div className="flex flex-row justify-between">
                <FormField
                  control={form.control}
                  name="bizType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        Objet type
                        <QuestionTooltip className="inline ml-1">
                          Determines which kind of objects this attribute can be set for.
                        </QuestionTooltip>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={true}
                      >
                        <FormControl>
                          <SelectTrigger className="w-72">
                            <SelectValue placeholder="Select a object type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-72">
                          <SelectItem value={String(AttributeBizTypes.User)}>
                            <div className="flex flex-row">
                              <UserIcon width={16} height={16} className="mr-1" />
                              User
                            </div>
                          </SelectItem>
                          <SelectItem value={String(AttributeBizTypes.Company)}>
                            <div className="flex flex-row">
                              <CompanyIcon width={16} height={16} className="mr-1" />
                              Company
                            </div>
                          </SelectItem>
                          <SelectItem value={String(AttributeBizTypes.Membership)}>
                            <div className="flex flex-row">
                              <UserIcon2 width={16} height={16} className="mr-1" />
                              Company Membership
                            </div>
                          </SelectItem>
                          <SelectItem value={String(AttributeBizTypes.Event)}>
                            <div className="flex flex-row">
                              <EventIcon2 width={16} height={16} className="mr-1" />
                              Event
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dataType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        Data type
                        <QuestionTooltip className="inline ml-1">
                          Determines what kind of values will be stored in this attribute.
                        </QuestionTooltip>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-72">
                            <SelectValue placeholder="Select a data type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-72">
                          <SelectItem value={String(BizAttributeTypes.Number)}>Number</SelectItem>
                          <SelectItem value={String(BizAttributeTypes.String)}>String</SelectItem>
                          <SelectItem value={String(BizAttributeTypes.Boolean)}>Boolean</SelectItem>
                          <SelectItem value={String(BizAttributeTypes.DateTime)}>
                            DateTime
                          </SelectItem>
                          <SelectItem value={String(BizAttributeTypes.List)}>List</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
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
                        <QuestionTooltip className="inline ml-1">
                          Human-friendly name shown in Usertour. we recommend using Word Case
                          (i.e.uppercasefrst letter, spaces between words) such as"Billing Plan".
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
                  control={form.control}
                  name="codeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        Code name
                        <QuestionTooltip className="inline ml-1">
                          Code-friendly name used in Webhooks and integrations to analytics
                          providers. we recommend using snake_case (i.e. lowercaseletters with words
                          separated by underscore).
                        </QuestionTooltip>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter code name"
                          className="w-72"
                          disabled={true}
                          {...field}
                        />
                      </FormControl>
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
                    <FormLabel className="flex flex-row">
                      Description
                      <QuestionTooltip className="inline ml-1">
                        Put any additional information for your own reference here.
                      </QuestionTooltip>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description" className="w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                Save Attribute
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

AttributeEditForm.displayName = 'AttributeEditForm';
