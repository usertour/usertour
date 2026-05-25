'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
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

interface EventEditDialogProps {
  event: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after a successful save — consumers refetch here. */
  onSubmit?: (success: boolean) => void;
}

const schema = z.object({
  displayName: z.string().max(20).min(2),
  codeName: z.string().max(20).min(2),
  description: z.string().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

const toFormValues = (event: Event): FormValues => ({
  displayName: event.displayName,
  codeName: event.codeName,
  description: event.description ?? '',
});

export const EventEditDialog = ({ event, open, onOpenChange, onSubmit }: EventEditDialogProps) => {
  const { invoke: updateEvent } = useUpdateEventMutation();
  const { t } = useTranslation();
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
      onSubmit?.(true);
      onOpenChange(false);
    },
    successMessage: 'The event has been successfully updated',
  });

  useEffect(() => {
    if (open) {
      state.form.reset(toFormValues(event));
      setSelectMode(false);
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event]);

  const handleAttributeSelect = useCallback(
    (attributeId: string) => {
      const exists = eventsOnAttributes.some((attr) => attr.id === attributeId);
      if (exists) {
        toast({
          variant: 'warning',
          title: t('settings.events.attributeAlreadyAssociated'),
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
    [eventsOnAttributes, eventAttrs, toast, t],
  );

  return (
    <SettingsDialogForm
      title={t('settings.events.editTitle')}
      open={open}
      onOpenChange={onOpenChange}
      state={state}
      submitLabel={t('settings.events.saveButton')}
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
                    {t('settings.events.form.displayNameLabel')}
                    <QuestionTooltip className="ml-1">
                      {t('settings.events.form.displayNameTooltip')}
                    </QuestionTooltip>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('settings.events.form.displayNamePlaceholder')}
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
              control={state.form.control}
              name="codeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-row">
                    {t('settings.events.form.codeNameLabel')}
                    <QuestionTooltip className="ml-1">
                      {t('settings.events.form.codeNameTooltip')}
                    </QuestionTooltip>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('settings.events.form.codeNamePlaceholder')}
                      className="w-72"
                      disabled
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
            control={state.form.control}
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

        <div className="flex flex-col w-1/3">
          <FormItem>
            <FormLabel className="flex flex-row">
              {t('settings.events.form.attributesLabel')}
              <QuestionTooltip className="ml-1">
                {t('settings.events.form.attributesTooltip')}
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
                  placeholder={t('settings.events.form.attributesPlaceholder')}
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
                  {t('settings.common.cancel')}
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
                {t('settings.events.form.addAttribute')}
              </div>
            )}
            <FormMessage />
          </FormItem>
        </div>
      </div>
    </SettingsDialogForm>
  );
};

EventEditDialog.displayName = 'EventEditDialog';
