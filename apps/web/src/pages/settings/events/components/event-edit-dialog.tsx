'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ListSkeletonCount,
  Button,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  QuestionTooltip,
  SelectPopover,
  SettingsDialogForm,
  useSettingsForm,
  useToast,
} from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import {
  useListAttributeOnEventsQuery,
  useListAttributesQuery,
  useUpdateEventMutation,
} from '@usertour/hooks';
import { AttributeBizTypes } from '@usertour/types';
import { CloseIcon, PlusIcon } from '@usertour/icons';
import { type Attribute, type Event } from '@usertour/types';
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

export const EventEditDialog = (props: EventEditDialogProps) => {
  const { event, open, onOpenChange, onSubmit } = props;
  const { invoke: updateEvent } = useUpdateEventMutation();
  const { t } = useTranslation();
  const [eventAttrs, setEventAttrs] = useState<Attribute[]>([]);
  const [eventsOnAttributes, setEventsOnAttributes] = useState<Attribute[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedAttributeValue, setSelectedAttributeValue] = useState('');
  const { project } = useAppContext();
  const { attributes: attributeList } = useListAttributesQuery(
    project?.id ?? '',
    AttributeBizTypes.Nil,
    { skip: !project?.id },
  );
  const { toast } = useToast();

  // Skip the query until the dialog actually opens — otherwise every row
  // on /settings/events mounts an EventEditDialog and fires this query in
  // parallel on page load, even though the user typically opens zero or
  // one of them. Apollo's cache-first policy keeps subsequent re-opens of
  // the same row free.
  const { attributeOnEvents, loading: loadingEventAttrs } = useListAttributeOnEventsQuery(
    event.id,
    { skip: !open },
  );

  useEffect(() => {
    if (!attributeOnEvents || !attributeList) {
      return;
    }
    const currentIds = new Set(attributeOnEvents.map((row) => row.attributeId));
    setEventAttrs(attributeList.filter((attr) => attr.bizType === 4));
    setEventsOnAttributes(attributeList.filter((attr) => currentIds.has(attr.id)));
  }, [attributeOnEvents, attributeList]);

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
        throw new Error(t('settings.events.updateFailure'));
      }
      onSubmit?.(true);
      onOpenChange(false);
    },
    successMessage: t('settings.events.updateSuccess'),
  });

  useEffect(() => {
    if (open) {
      state.form.reset(toFormValues(event));
      setSelectMode(false);
      // Do NOT reset `eventsOnAttributes` here. React commits effects in
      // source order, so a reset effect below the canonical-hydration
      // effect above would race with it: on a cached re-open, the
      // hydration effect fires first (re-derives [A,B] from
      // `attributeOnEvents`), then this effect overwrites it with [].
      // The subsequent Save would then send `attributeIds: []` and the
      // server would silently clear every association on the row. The
      // hydration effect above is enough — when `open` flips false,
      // Apollo's `skip` sends `attributeOnEvents` to `undefined`, and
      // when it flips back true the dep change re-fires hydration.
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
      cancelLabel={t('settings.common.cancel')}
      // Without this guard, a fast user can submit while
      // `attributeOnEvents` is still in flight — `eventsOnAttributes`
      // would be the empty initial state, silently wiping the row's
      // attribute associations on the server.
      submitDisabled={loadingEventAttrs}
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
                  // Hide attributes already associated with this event;
                  // re-picking them is a no-op (with a warning toast),
                  // and listing them adds noise as the user works
                  // through the available set.
                  options={eventAttrs
                    .filter(
                      (attr) => !eventsOnAttributes.some((selected) => selected.id === attr.id),
                    )
                    .map((attr) => ({
                      value: attr.id,
                      name: attr.displayName,
                    }))}
                  onValueChange={handleAttributeSelect}
                  // Render inline (no portal) because this dialog uses
                  // react-remove-scroll, which kills wheel events on
                  // body-portaled descendants — see SelectPopoverProps.
                  withoutPortal
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
