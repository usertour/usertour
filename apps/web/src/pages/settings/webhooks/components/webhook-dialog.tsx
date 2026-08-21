import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { MAX_TOPIC_SUBSCRIPTIONS } from '@usertour/constants';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { getErrorMessage } from '@usertour/helpers';
import { type Webhook, useCreateWebhookMutation, useUpdateWebhookMutation } from '@usertour/hooks';
import { SpinnerIcon } from '@usertour/icons';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Switch,
  useToast,
} from '@usertour/ui';
import { useAppContext } from '@/contexts/app-context';
import { useEventList } from '@/hooks/use-event-list';
import { WebhookTopicPicker } from './webhook-topic-picker';

/**
 * The URL rule mirrors the server's egress guard: public HTTPS only, unless the
 * deployment allows private-network egress (self-hosted `ALLOW_PRIVATE_NETWORK_EGRESS`),
 * where any well-formed http(s) URL is accepted — a receiver on the operator's
 * own network is the whole point of that switch. Both failure modes carry the
 * same marker; the field renders it through i18n rather than zod's default
 * English. The server validates again either way.
 */
const buildWebhookFormSchema = (allowPrivateNetworkEgress: boolean) =>
  z.object({
    url: allowPrivateNetworkEgress
      ? z.string().max(2083, 'urlTooLong').url('url')
      : z.string().max(2083, 'urlTooLong').url('url').startsWith('https://', 'url'),
    // Stored subscription strings verbatim (see WebhookTopicPicker for the
    // grammar); the picker edits this array in place — no encode/decode layer.
    topics: z.array(z.string()).min(1, 'topics').max(MAX_TOPIC_SUBSCRIPTIONS, 'topicsMax'),
    description: z.string().max(200).optional(),
    enabled: z.boolean(),
  });

type WebhookFormValues = z.infer<ReturnType<typeof buildWebhookFormSchema>>;

const formDefaults: WebhookFormValues = {
  url: '',
  topics: [],
  description: '',
  enabled: true,
};

const valuesFromWebhook = (webhook: Webhook): WebhookFormValues => ({
  url: webhook.url,
  topics: webhook.topics,
  description: webhook.description ?? '',
  enabled: webhook.enabled,
});

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
  const { environment, globalConfig } = useAppContext();
  const { eventList } = useEventList();
  const { toast } = useToast();
  const { t } = useTranslation();
  const allowPrivateNetworkEgress = !!globalConfig?.allowPrivateNetworkEgress;
  const urlHint = allowPrivateNetworkEgress
    ? t('settings.webhooks.form.urlHintPrivateAllowed')
    : t('settings.webhooks.form.urlHint');

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(buildWebhookFormSchema(allowPrivateNetworkEgress)),
    defaultValues: formDefaults,
    mode: 'onChange',
  });

  // The dialog stays mounted, so reset on each open — a cancelled draft must
  // not reappear, and edit mode must re-seed from the current row. Keyed on
  // the row's ID, not its identity: the list is cache-and-network and selects
  // fields that drift with delivery outcomes (consecutiveFailures, updatedAt),
  // so a background cache settle would otherwise wipe in-progress edits.
  // biome-ignore lint/correctness/useExhaustiveDependencies: webhook identity intentionally excluded (see above)
  useEffect(() => {
    if (open) {
      form.reset(webhook ? valuesFromWebhook(webhook) : formDefaults);
    }
  }, [open, webhook?.id, form]);

  const { invoke: createWebhook, loading: creating } = useCreateWebhookMutation();
  const { invoke: updateWebhook, loading: updating } = useUpdateWebhookMutation();
  const saving = creating || updating;

  const handleSubmit = async (values: WebhookFormValues) => {
    if (!environment) {
      return;
    }
    try {
      const { topics } = values;
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
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
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
                    {/* Hint stays muted; only a real validation failure turns red
                        (FormMessage would print zod's marker, so render the copy
                        directly — same as the topics error below). */}
                    {form.formState.errors.url ? (
                      <p className="text-[0.8rem] font-medium text-destructive">
                        {form.formState.errors.url.message === 'urlTooLong'
                          ? t('settings.webhooks.form.urlTooLong')
                          : urlHint}
                      </p>
                    ) : (
                      <FormDescription>{urlHint}</FormDescription>
                    )}
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
                name="topics"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.webhooks.form.topics')}</FormLabel>
                    <FormControl>
                      <WebhookTopicPicker
                        value={field.value}
                        onChange={field.onChange}
                        events={eventList ?? []}
                        invalid={!!form.formState.errors.topics}
                      />
                    </FormControl>
                    {form.formState.errors.topics && (
                      <p className="text-[0.8rem] font-medium text-destructive">
                        {form.formState.errors.topics.message === 'topicsMax'
                          ? t('settings.webhooks.form.topicsTooMany', {
                              max: MAX_TOPIC_SUBSCRIPTIONS,
                            })
                          : t('settings.webhooks.form.topicsRequired')}
                      </p>
                    )}
                  </FormItem>
                )}
              />

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
