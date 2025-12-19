'use client';
import { getApolloClient } from '@/apollo';
import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { createEvent } from '@usertour-packages/gql';
import { listAttributes } from '@usertour-packages/gql';
import { PlusIcon } from '@usertour-packages/icons';
import { CloseIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@usertour-packages/select';
import { getErrorMessage } from '@usertour/helpers';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ScrollArea } from '@usertour-packages/scroll-area';

interface CreateFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const formSchema = z.object({
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
  attributeIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  description: '',
  displayName: '',
  codeName: '',
  attributeIds: [],
};

export const EventCreateForm = ({ onClose, isOpen }: CreateFormProps) => {
  const [createMutation] = useMutation(createEvent);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [eventAttrs, setEventAttrs] = useState<Attribute[]>([]);
  const [eventsOnAttributes, setEventsOnAttributes] = useState<Attribute[]>([]);
  const [selectAttributeStatus, setSelectAttributeStatus] = useState<boolean>(false);
  const [selectedAttributeValue, setSelectedAttributeValue] = useState<string>('');
  const { project } = useAppContext();
  const { toast } = useToast();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const getEventAttrs = useCallback(async () => {
    const client = await getApolloClient();
    const { data } = await client.query({
      query: listAttributes,
      variables: { projectId: project?.id, bizType: 4 },
    });

    setEventAttrs(data?.listAttributes as Attribute[]);
  }, [project?.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset();
    setEventsOnAttributes([]);
    setSelectAttributeStatus(false);
    getEventAttrs();
  }, [form, getEventAttrs, isOpen]);
  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const attributeIds = eventsOnAttributes.map((item) => item.id);

      const data = {
        ...formValues,
        projectId: project?.id,
        attributeIds,
      };

      const ret = await createMutation({ variables: { data } });
      if (!ret.data?.createEvent?.id) {
        showError('Create Event failed.');
      }
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  const handleAttrValueChange = useCallback(
    (value: string) => {
      const exists = eventsOnAttributes.some((item) => item.id === value);
      const foundItem = eventAttrs.find((item) => item.id === value);
      if (!exists) {
        foundItem &&
          setEventsOnAttributes((pre) => {
            return [...pre, { ...foundItem }];
          });
        setSelectAttributeStatus(false);
        setSelectedAttributeValue(value);
      } else {
        toast({
          variant: 'warning',
          title: 'That attribute is already associated with the event.',
        });
        setSelectedAttributeValue('');
      }
    },
    [
      eventsOnAttributes,
      eventAttrs,
      setEventsOnAttributes,
      setSelectAttributeStatus,
      setSelectedAttributeValue,
    ],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-5xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <div className="flex mt-4 mb-4 ">
              <div className="flex flex-col mr-6 w-2/3 ">
                <div className="flex flex-row justify-between">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex flex-row">
                          Display name
                          <QuestionTooltip className="ml-1">
                            Human-friendly name shown in Usertour. we recommend using Word Case
                            (i.e.uppercasefrst letter, spaces between words) such as"Billing Plan".
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
                            Code-friendly name used in Webhooks and integrations to analytics
                            providers. we recommend using snake_case (i.e. lowercaseletters with
                            words separated by underscore).
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
                      <FormLabel className="flex flex-row">
                        Description
                        <QuestionTooltip className="ml-1">
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

              <div className="flex flex-col w-1/3">
                <FormField
                  control={form.control}
                  name="attributeIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        Event attributes
                        <QuestionTooltip className="ml-1">
                          Determines what kind of values will be stored in this attribute.
                        </QuestionTooltip>
                      </FormLabel>
                      <hr className="border-t" />

                      {eventsOnAttributes.map((eventsOnAttribute, i) => {
                        return (
                          <div
                            className="relative group border-b border-gray-300 hover:bg-blue-100"
                            key={i}
                            style={{ marginTop: '0' }}
                          >
                            <div className="p-2">{eventsOnAttribute.displayName}</div>
                            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 hidden group-hover:flex items-center justify-center">
                              <CloseIcon
                                width={16}
                                height={16}
                                className="mr-1 text-gray-600 hover:text-gray-800 hover:bg-red-200 w-6 h-6 p-1 rounded cursor-pointer"
                                onClick={() =>
                                  setEventsOnAttributes((prev) =>
                                    prev.filter((_, index) => index !== i),
                                  )
                                }
                              />
                            </div>
                          </div>
                        );
                      })}

                      {selectAttributeStatus ? (
                        <div className="flex flex-row">
                          <Select
                            {...field}
                            onValueChange={handleAttrValueChange}
                            value={selectedAttributeValue}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <span className="text-gray-500">
                                  {selectedAttributeValue ? '' : 'Select an attribute'}
                                </span>
                              </SelectTrigger>
                            </FormControl>

                            <SelectContent className="w-full" withoutPortal>
                              <ScrollArea className="h-72">
                                {eventAttrs.map((eventAttrs) => {
                                  return (
                                    <SelectItem value={String(eventAttrs.id)} key={eventAttrs.id}>
                                      {eventAttrs.displayName}
                                    </SelectItem>
                                  );
                                })}
                              </ScrollArea>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            className="px-0.5 ml-1 h-fit "
                            onClick={() => setSelectAttributeStatus(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="h-8 text-primary items-center flex flex-row justify-center rounded-md text-sm font-medium cursor-pointer"
                          onClick={() => {
                            setSelectedAttributeValue('');
                            setSelectAttributeStatus(true);
                          }}
                        >
                          <PlusIcon width={16} height={16} />
                          Add attribute
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Create Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

EventCreateForm.displayName = 'EventCreateForm';
