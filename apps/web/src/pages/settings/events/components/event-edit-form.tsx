'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { ListSkeletonCount } from '@/components/molecules/skeleton';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { Button } from '@usertour/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour/form';
import { listAttributeOnEvents } from '@usertour/gql';
import { useUpdateEventMutation } from '@usertour/hooks';
import { CloseIcon, PlusIcon } from '@usertour/icons';
import { Input } from '@usertour/input';
import { QuestionTooltip } from '@usertour/tooltip';
import { type Attribute, type Event } from '@usertour/types';
import { SelectPopover, SettingsDialogForm, useSettingsForm } from '@usertour/ui';
import { useToast } from '@usertour/use-toast';
import { z } from 'zod';

interface EventEditFormProps {
  isOpen: boolean;
  event: Event;
  onClose: () => void;
}

const schema = z.object({
  displayName: z.string({ required_error: 'Please input display name.' }).max(20).min(2),
  codeName: z.string({ required_error: 'Please input code name.' }).max(20).min(2),
  description: z.string().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

const toFormValues = (event: Event): FormValues => ({
  displayName: event.displayName,
  codeName: event.codeName,
  description: event.description ?? '',
});

export const EventEditForm = ({ event, isOpen, onClose }: EventEditFormProps) => {
  const { invoke: updateEvent } = useUpdateEventMutation();
  const [eventAttrs, setEventAttrs] = useState<Attribute[]>([]);
  const [eventsOnAttributes, setEventsOnAttributes] = useState<Attribute[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedAttributeValue, setSelectedAttributeValue] = useState('');
  const { attributeList } = useAttributeListContext();
  const { toast } = useToast();

  const {
    data: attributeOnEventsData,
    loading: loadingEventAttrs,
    refetch,
  } = useQuery(listAttributeOnEvents, {
    variables: { eventId: event.id },
  });

  useEffect(() => {
    const rows = attributeOnEventsData?.listAttributeOnEvents;
    if (!rows || !attributeList) {
      return;
    }
    const currentIds = new Set(rows.map((row: { attributeId: string }) => row.attributeId));
    setEventAttrs(attributeList.filter((attr) => attr.bizType === 4));
    setEventsOnAttributes(attributeList.filter((attr) => currentIds.has(attr.id)));
  }, [attributeOnEventsData, attributeList]);

  const state = useSettingsForm<FormValues>({
    schema,
    defaultValues: toFormValues(event),
    submit: async (values) => {
      const success = await updateEvent({
        ...values,
        id: event.id,
        attributeIds: eventsOnAttributes.map((attr) => attr.id),
      });
      if (!success) {
        throw new Error('Update Event failed.');
      }
      onClose();
    },
    successMessage: 'The event has been successfully updated',
  });

  useEffect(() => {
    if (isOpen) {
      state.form.reset(toFormValues(event));
      setSelectMode(false);
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, event]);

  const handleAttributeSelect = useCallback(
    (attributeId: string) => {
      const exists = eventsOnAttributes.some((attr) => attr.id === attributeId);
      if (exists) {
        toast({
          variant: 'warning',
          title: 'That attribute is already associated with the event.',
        });
        setSelectedAttributeValue('');
        return;
      }
      const found = eventAttrs.find((attr) => attr.id === attributeId);
      if (found) {
        setEventsOnAttributes((prev) => [...prev, { ...found }]);
        setSelectMode(false);
        setSelectedAttributeValue(attributeId);
      }
    },
    [eventsOnAttributes, eventAttrs, toast],
  );

  return (
    <SettingsDialogForm
      title="Edit Event"
      open={isOpen}
      onOpenChange={(next) => !next && onClose()}
      state={state}
      submitLabel="Save Event"
      contentClassName="max-w-5xl"
    >
      <div className="flex">
        <div className="flex flex-col mr-6 w-2/3 space-y-2">
          <div className="flex flex-row justify-between">
            <FormField
              control={state.form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-row">
                    Display name
                    <QuestionTooltip className="ml-1">
                      Human-friendly name shown across the Usertour dashboard. e.g. "User signed
                      up".
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
              control={state.form.control}
              name="codeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-row">
                    Code name
                    <QuestionTooltip className="ml-1">
                      Code-friendly identifier used throughout Usertour to reference this event.
                      e.g. "user_signed_up".
                    </QuestionTooltip>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter code name" className="w-72" disabled {...field} />
                  </FormControl>
                  <FormDescription>Can NOT be changed later</FormDescription>
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

        <div className="flex flex-col w-1/3">
          <FormItem>
            <FormLabel className="flex flex-row">
              Event attributes
              <QuestionTooltip className="ml-1">
                Attributes included in this event's payload schema. e.g. "plan_name", "price".
              </QuestionTooltip>
            </FormLabel>
            <hr className="border-t" />
            {loadingEventAttrs && <ListSkeletonCount count={1} />}
            {eventsOnAttributes.map((attr, index) => (
              <div
                key={attr.id}
                className="relative group border-b hover:bg-muted"
                style={{ marginTop: 0 }}
              >
                <div className="p-2 text-sm">{attr.displayName}</div>
                <div className="absolute top-1/2 right-2 -translate-y-1/2 hidden group-hover:flex items-center">
                  <Button
                    variant="ghost"
                    className="mr-1 w-6 h-6 p-1 rounded cursor-pointer"
                    onClick={() =>
                      setEventsOnAttributes((prev) => prev.filter((_, idx) => idx !== index))
                    }
                  >
                    <CloseIcon width={16} height={16} />
                  </Button>
                </div>
              </div>
            ))}

            {selectMode ? (
              <div className="flex flex-row">
                <SelectPopover
                  className="w-full"
                  contentClassName="w-[--radix-popover-trigger-width]"
                  placeholder="Select an attribute"
                  value={selectedAttributeValue}
                  options={eventAttrs.map((attr) => ({
                    value: attr.id,
                    name: attr.displayName,
                  }))}
                  onValueChange={handleAttributeSelect}
                />
                <Button
                  variant="ghost"
                  className="px-0.5 ml-1 h-fit"
                  onClick={() => setSelectMode(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div
                className="h-8 text-primary items-center flex flex-row justify-center rounded-md text-sm font-medium cursor-pointer"
                onClick={() => {
                  setSelectedAttributeValue('');
                  setSelectMode(true);
                }}
              >
                <PlusIcon width={16} height={16} />
                Add attribute
              </div>
            )}
            <FormMessage />
          </FormItem>
        </div>
      </div>
    </SettingsDialogForm>
  );
};

EventEditForm.displayName = 'EventEditForm';
