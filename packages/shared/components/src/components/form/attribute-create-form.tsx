'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-ui/form';
import { CompanyIcon, EventIcon2, SpinnerIcon, UserIcon, UserIcon2 } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour-ui/select';
import {
  CreateAttributeMutationVariables,
  useCreateAttributeMutation,
} from '@usertour-ui/shared-hooks';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
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
      <DialogContent className="max-w-2xl">
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
                        Objet type
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-700">
                              <p>Determines which kind of objects this attribute can be set for.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-700">
                              <p>
                                Determines what kind of values will be stored in this attribute.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-700">
                              <p>
                                Human-friendly name shown in Usertour. we recommend using Word Case
                                (i.e.uppercasefrst letter, spaces between words) such as"Billing
                                Plan".
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs bg-slate-700">
                              <p>
                                Code-friendly name used in Webhooks and integrations to analytics
                                providers. we recommend using snake_case (i.e. lowercaseletters with
                                words separated by underscore).
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                    <FormLabel className="flex flex-row">
                      Description
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <QuestionMarkCircledIcon className="ml-1 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-slate-700">
                            <p>Put any additional information for your ownreference here.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
