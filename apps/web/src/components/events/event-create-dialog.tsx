'use client';
import { getApolloClient } from '@/apollo';
import { SpinnerIcon } from '@usertour/icons';
import { useAppContext } from '@/contexts/app-context';
import { Attribute } from '@usertour/types';
import { useMutation } from '@apollo/client';
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
import { createEvent } from '@usertour/gql';
import { listAttributes } from '@usertour/gql';
import { PlusIcon } from '@usertour/icons';
import { CloseIcon } from '@usertour/icons';
import { Input } from '@usertour/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@usertour/select';
import { getErrorMessage } from '@usertour/helpers';
import { QuestionTooltip } from '@usertour/tooltip';
import { useToast } from '@usertour/use-toast';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ScrollArea } from '@usertour/scroll-area';

interface CreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (event: CreatedEvent) => void;
}

type CreatedEvent = {
  id: string;
  displayName: string;
  codeName: string;
};

const formSchema = z.object({
  displayName: z.string().max(20).min(2),
  codeName: z.string().max(20).min(2),
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

export const EventCreateDialog = ({ onClose, isOpen, onCreated }: CreateFormProps) => {
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
        return;
      }
      onCreated?.({
        id: ret.data.createEvent.id,
        displayName: ret.data.createEvent.displayName,
        codeName: ret.data.createEvent.codeName,
      });
      toast({
        variant: 'success',
        title: 'The event has been successfully created',
      });
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
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
      <DialogContent className="max-w-5xl" aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
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
                          <QuestionTooltip className="ml-1">
                            Human-friendly name shown across the Usertour dashboard. e.g. "User
                            signed up".
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
                            event. e.g. "user_signed_up".
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

              <div className="flex flex-col w-1/3">
                <FormField
                  control={form.control}
                  name="attributeIds"
                  render={() => (
                    <FormItem>
                      <FormLabel className="flex flex-row">
                        Event attributes
                        <QuestionTooltip className="ml-1">
                          Attributes included in this event's payload schema. e.g. "plan_name",
                          "price".
                        </QuestionTooltip>
                      </FormLabel>
                      <hr className="border-t" />

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
                {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                Create Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

EventCreateDialog.displayName = 'EventCreateDialog';
