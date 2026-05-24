'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@usertour/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/select';
import { CreateAttributeMutationVariables, useCreateAttributeMutation } from '@usertour/hooks';
import { getErrorMessage } from '@usertour/helpers';
import { QuestionTooltip } from '@usertour/tooltip';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import { useToast } from '@usertour/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface CreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
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

const defaultValues: Partial<FormValues> = {
  description: '',
  bizType: String(AttributeBizTypes.User),
  dataType: String(BizAttributeTypes.Number),
};

export const AttributeCreateForm = ({ onClose, isOpen, projectId }: CreateFormProps) => {
  const { invoke } = useCreateAttributeMutation();
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
      const isSuccess = await invoke(data);
      if (!isSuccess) {
        showError('Create Attribute failed.');
      }
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        Object type
                        <QuestionTooltip className="ml-1">
                          The entity this attribute belongs to: User, Company, Membership, or Event.
                        </QuestionTooltip>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-72">
                            <SelectValue placeholder="Select an object type" />
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
                        <QuestionTooltip className="ml-1">
                          The value type stored in this attribute. Determines serialization and
                          filter operators.
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
              <Button variant="outline" type="button" onClick={() => onClose()}>
                Cancel
              </Button>
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
