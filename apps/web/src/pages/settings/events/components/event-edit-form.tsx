'use client';

import { Icons } from '@/components/atoms/icons';
import { ListSkeletonCount } from '@/components/molecules/skeleton';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { Event } from '@usertour-ui/types';
import { Attribute } from '@usertour-ui/types';
import { useMutation, useQuery } from '@apollo/client';
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
import { listAttributeOnEvents, updateEvent } from '@usertour-ui/gql';
import { PlusIcon } from '@usertour-ui/icons';
import { CloseIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@usertour-ui/select';
import { getErrorMessage } from '@usertour-ui/shared-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { useToast } from '@usertour-ui/use-toast';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface EditFormProps {
  isOpen: boolean;
  event: Event;
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
  description: z.string().min(0).max(100),
  attributeIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const EventEditForm = (props: EditFormProps) => {
  const { onClose, isOpen, event } = props;
  const [updateMutation] = useMutation(updateEvent);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [eventAttrs, setEventAttrs] = useState<Attribute[]>([]);
  const [eventsOnAttributes, setEventsOnAttributes] = useState<Attribute[]>([]);
  const [selectAttributeStatus, setSelectAttributeStatus] = useState<boolean>(false);
  const [selectedAttributeValue, setSelectedAttributeValue] = useState<string>('');
  const { attributeList } = useAttributeListContext();

  const {
    data: attributeOnEvents,
    loading,
    refetch,
  } = useQuery(listAttributeOnEvents, {
    variables: { eventId: event.id },
  });
  const { toast } = useToast();

  useEffect(() => {
    const attributeOnEventsData = attributeOnEvents?.listAttributeOnEvents;

    if (attributeOnEventsData) {
      const currentAttributeIds = attributeOnEventsData.map(
        (item: { attributeId: string }) => item.attributeId,
      );
      if (attributeList) {
        const matchedItems = attributeList.filter((item) => currentAttributeIds.includes(item.id));
        setEventAttrs(attributeList.filter((attr) => attr.bizType === 4));
        setEventsOnAttributes(matchedItems);
      }
    }
  }, [attributeOnEvents, attributeList]);

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...event,
      attributeIds: [],
    },
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset({
      ...event,
    });
    setSelectAttributeStatus(false);
    refetch();
  }, [isOpen, event, form]);

  const handleOnSubmit = useCallback(
    async (formValues: FormValues) => {
      setIsLoading(true);
      try {
        const attributeIds = eventsOnAttributes.map((item) => item.id);

        const data = {
          ...formValues,
          id: event.id,
          attributeIds,
        };

        const ret = await updateMutation({ variables: { data } });

        if (!ret.data?.updateEvent?.id) {
          showError('Update Event failed.');
        }
        onClose();
      } catch (error) {
        showError(getErrorMessage(error));
      }
      setIsLoading(false);
    },
    [event.id, eventsOnAttributes, onClose, updateMutation],
  );

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
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <div className="flex mt-4 mb-4 ">
              <div className="flex flex-col mr-6 w-2/3 space-y-2">
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
                                  Human-friendly name shown in Usertour. we recommend using Word
                                  Case (i.e.uppercasefrst letter, spaces between words) such
                                  as"Billing Plan".
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
                                  providers. we recommend using snake_case (i.e. lowercaseletters
                                  with words separated by underscore).
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter code name"
                            className="w-72"
                            disabled={true}
                            {...field}
                          />
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

              <div className="flex flex-col w-1/3">
                <FormField
                  control={form.control}
                  name="attributeIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        Event attributes
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
                      <hr className="border-t" />
                      {loading && <ListSkeletonCount count={1} />}
                      {eventsOnAttributes.map((eventsOnAttribute, i) => {
                        return (
                          <div
                            className="relative group border-b hover:bg-muted"
                            key={i}
                            style={{ marginTop: '0' }}
                          >
                            <div className="p-2 text-sm">{eventsOnAttribute.displayName}</div>
                            <div className="absolute top-1/2 right-2 transform -translate-y-1/2 hidden group-hover:flex items-center justify-center">
                              <Button
                                variant={'ghost'}
                                className="mr-1 w-6 h-6 p-1 rounded cursor-pointer"
                                onClick={() =>
                                  setEventsOnAttributes((prev) =>
                                    prev.filter((_, index) => index !== i),
                                  )
                                }
                              >
                                <CloseIcon width={16} height={16} />
                              </Button>
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
                            <SelectContent className="w-full">
                              {eventAttrs.map((eventAttrs) => {
                                return (
                                  <SelectItem value={`${eventAttrs.id}`} key={eventAttrs.id}>
                                    {eventAttrs.displayName}
                                  </SelectItem>
                                );
                              })}
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
                Save Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

EventEditForm.displayName = 'EventEditForm';
