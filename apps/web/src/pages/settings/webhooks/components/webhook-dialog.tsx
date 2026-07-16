import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { getErrorMessage } from '@usertour/helpers';
import { type Webhook, useCreateWebhookMutation, useUpdateWebhookMutation } from '@usertour/hooks';
import { SpinnerIcon } from '@usertour/icons';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Switch,
  useToast,
} from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { useEventList } from '@/hooks/use-event-list';

const EVENT_TOPIC_PREFIX = 'event.tracked';
const PAGE_VIEWED_TOPIC = `${EVENT_TOPIC_PREFIX}.page_viewed`;
const CONTENT_NAMESPACE = 'content';
const CONTENT_PUBLISHED_TOPIC = 'content.published';

const webhookFormSchema = z
  .object({
    url: z.string().url().startsWith('https://'),
    mode: z.enum(['all', 'selected']),
    selectedTopics: z.array(z.string()),
    includePageViewed: z.boolean(),
    includeContentPublished: z.boolean(),
    description: z.string().max(200).optional(),
    enabled: z.boolean(),
  })
  .refine((values) => values.mode === 'all' || values.selectedTopics.length > 0, {
    path: ['selectedTopics'],
    message: 'topics',
  });

type WebhookFormValues = z.infer<typeof webhookFormSchema>;

const formDefaults: WebhookFormValues = {
  url: '',
  mode: 'all',
  selectedTopics: [],
  includePageViewed: false,
  includeContentPublished: false,
  description: '',
  enabled: true,
};

/** UI grouping of event codeNames by content family (custom events fall through). */
const TOPIC_GROUPS: { key: string; prefixes: string[] }[] = [
  { key: 'flows', prefixes: ['flow_', 'tooltip_'] },
  { key: 'checklists', prefixes: ['checklist_'] },
  { key: 'surveys', prefixes: ['question_'] },
  { key: 'launchers', prefixes: ['launcher_'] },
  { key: 'banners', prefixes: ['banner_'] },
  { key: 'resourceCenters', prefixes: ['resource_center_'] },
  { key: 'announcements', prefixes: ['announcement_'] },
  { key: 'trackers', prefixes: ['event_tracker_'] },
  { key: 'pages', prefixes: ['page_'] },
];

const groupForCodeName = (codeName: string): string => {
  const group = TOPIC_GROUPS.find((candidate) =>
    candidate.prefixes.some((prefix) => codeName.startsWith(prefix)),
  );
  return group?.key ?? 'custom';
};

const valuesFromWebhook = (webhook: Webhook): WebhookFormValues => {
  const isAll = webhook.topics.includes('*') || webhook.topics.includes(EVENT_TOPIC_PREFIX);
  return {
    url: webhook.url,
    mode: isAll ? 'all' : 'selected',
    selectedTopics: isAll ? [] : webhook.topics,
    includePageViewed: isAll && webhook.topics.includes(PAGE_VIEWED_TOPIC),
    includeContentPublished:
      isAll &&
      (webhook.topics.includes('*') ||
        webhook.topics.includes(CONTENT_NAMESPACE) ||
        webhook.topics.includes(CONTENT_PUBLISHED_TOPIC)),
    description: webhook.description ?? '',
    enabled: webhook.enabled,
  };
};

const topicsFromValues = (values: WebhookFormValues): string[] => {
  if (values.mode === 'all') {
    // "All events" subscribes at the namespace level so future events flow in
    // automatically; page_viewed is excluded from it server-side and rides as
    // an explicit topic when opted in. Content notifications are their own
    // namespace, opted into separately.
    return [
      EVENT_TOPIC_PREFIX,
      ...(values.includePageViewed ? [PAGE_VIEWED_TOPIC] : []),
      ...(values.includeContentPublished ? [CONTENT_NAMESPACE] : []),
    ];
  }
  return values.selectedTopics;
};

export interface WebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode; absent → create mode. */
  webhook?: Webhook;
  /** Called only after a successful save — consumers refetch here. */
  onSubmit?: () => void;
}

export const WebhookDialog = (props: WebhookDialogProps) => {
  const { open, onOpenChange, webhook, onSubmit } = props;
  const { environment } = useAppContext();
  const { eventList } = useEventList();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: formDefaults,
    mode: 'onChange',
  });

  // The dialog stays mounted, so reset on each open — a cancelled draft must
  // not reappear, and edit mode must re-seed from the current row.
  useEffect(() => {
    if (open) {
      form.reset(webhook ? valuesFromWebhook(webhook) : formDefaults);
    }
  }, [open, webhook, form]);

  const { invoke: createWebhook, loading: creating } = useCreateWebhookMutation();
  const { invoke: updateWebhook, loading: updating } = useUpdateWebhookMutation();
  const saving = creating || updating;

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, { codeName: string; displayName: string }[]>();
    for (const event of eventList ?? []) {
      const key = event.predefined ? groupForCodeName(event.codeName) : 'custom';
      const bucket = groups.get(key) ?? [];
      bucket.push({ codeName: event.codeName, displayName: event.displayName });
      groups.set(key, bucket);
    }
    const orderedKeys = [...TOPIC_GROUPS.map((group) => group.key), 'custom'];
    return orderedKeys
      .filter((key) => groups.has(key))
      .map((key) => ({ key, events: groups.get(key) ?? [] }));
  }, [eventList]);

  const mode = form.watch('mode');

  const handleSubmit = async (values: WebhookFormValues) => {
    if (!environment) {
      return;
    }
    try {
      const topics = topicsFromValues(values);
      const result = webhook
        ? await updateWebhook({
            id: webhook.id,
            url: values.url.trim(),
            topics,
            enabled: values.enabled,
            description: values.description?.trim() ?? '',
          })
        : await createWebhook({
            environmentId: environment.id,
            url: values.url.trim(),
            topics,
            enabled: values.enabled,
            description: values.description?.trim() || undefined,
          });
      if (!result) {
        toast({ variant: 'destructive', title: t('settings.webhooks.saveFailure') });
        return;
      }
      onSubmit?.();
      onOpenChange(false);
      toast({
        variant: 'success',
        title: webhook
          ? t('settings.webhooks.updateSuccess')
          : t('settings.webhooks.createSuccess'),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" aria-describedby={undefined}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {webhook ? t('settings.webhooks.editTitle') : t('settings.webhooks.createTitle')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.webhooks.form.url')}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/usertour" {...field} />
                    </FormControl>
                    <FormMessage>{t('settings.webhooks.form.urlHint')}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.webhooks.form.description')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('settings.webhooks.form.descriptionPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.webhooks.form.topics')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="all" id="webhook-topics-all" />
                          <Label htmlFor="webhook-topics-all" className="font-normal">
                            {t('settings.webhooks.form.allEvents')}
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="selected" id="webhook-topics-selected" />
                          <Label htmlFor="webhook-topics-selected" className="font-normal">
                            {t('settings.webhooks.form.selectedEvents')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              {mode === 'all' && (
                <>
                  <FormField
                    control={form.control}
                    name="includePageViewed"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 pl-6">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal text-muted-foreground">
                          {t('settings.webhooks.form.includePageViewed')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="includeContentPublished"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 pl-6">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal text-muted-foreground">
                          {t('settings.webhooks.form.includeContentPublished')}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {mode === 'selected' && (
                <FormField
                  control={form.control}
                  name="selectedTopics"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ScrollArea className="h-64 rounded-md border p-3">
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <div className="text-xs font-medium text-muted-foreground">
                                {t('settings.webhooks.topicGroups.configuration')}
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="webhook-topic-content-published"
                                  checked={field.value.includes(CONTENT_PUBLISHED_TOPIC)}
                                  onCheckedChange={(next) => {
                                    field.onChange(
                                      next
                                        ? [...field.value, CONTENT_PUBLISHED_TOPIC]
                                        : field.value.filter(
                                            (value) => value !== CONTENT_PUBLISHED_TOPIC,
                                          ),
                                    );
                                  }}
                                />
                                <Label
                                  htmlFor="webhook-topic-content-published"
                                  className="font-normal"
                                >
                                  {t('settings.webhooks.form.contentPublished')}
                                  <span className="ml-1.5 text-xs text-muted-foreground">
                                    content.published
                                  </span>
                                </Label>
                              </div>
                            </div>
                            {groupedEvents.map((group) => (
                              <div key={group.key} className="space-y-1.5">
                                <div className="text-xs font-medium text-muted-foreground">
                                  {t(`settings.webhooks.topicGroups.${group.key}`)}
                                </div>
                                {group.events.map((event) => {
                                  const topic = `${EVENT_TOPIC_PREFIX}.${event.codeName}`;
                                  const checked = field.value.includes(topic);
                                  return (
                                    <div key={event.codeName} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`webhook-topic-${event.codeName}`}
                                        checked={checked}
                                        onCheckedChange={(next) => {
                                          field.onChange(
                                            next
                                              ? [...field.value, topic]
                                              : field.value.filter((value) => value !== topic),
                                          );
                                        }}
                                      />
                                      <Label
                                        htmlFor={`webhook-topic-${event.codeName}`}
                                        className="font-normal"
                                      >
                                        {event.displayName}
                                        <span className="ml-1.5 text-xs text-muted-foreground">
                                          {event.codeName}
                                        </span>
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </FormControl>
                      {form.formState.errors.selectedTopics && (
                        <p className="text-sm font-medium text-destructive">
                          {t('settings.webhooks.form.topicsRequired')}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 rounded-md border px-3 py-2.5">
                    <FormLabel className="font-normal">
                      {t('settings.webhooks.form.enabled')}
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
                {webhook ? t('settings.webhooks.saveButton') : t('settings.webhooks.createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

WebhookDialog.displayName = 'WebhookDialog';
