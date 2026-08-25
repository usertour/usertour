import { type ReactNode, useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { z } from 'zod';
import { getErrorMessage } from '@usertour/helpers';
import {
  type Integration,
  type OutboundMessage,
  useDeleteIntegrationMutation,
  useGetProjectConfigQuery,
  useListIntegrationsQuery,
  useQueryIntegrationMessagesQuery,
  useSendIntegrationTestEventMutation,
  useUpsertIntegrationMutation,
} from '@usertour/hooks';
import { RiRefreshLine, RiSendPlaneLine, SpinnerIcon } from '@usertour/icons';
import {
  Button,
  DestructiveConfirmDialog,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
  LoadingButton,
  QuestionTooltip,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Separator,
  SettingsCard,
  SettingsCardStack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import type { IntegrationRegion, PageInfo } from '@usertour/types';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { useLoadMoreAccumulator } from '@/hooks/use-load-more-accumulator';
import { OutboundMessageDialog } from '../../components/outbound-message-dialog';
import { OutboundMessageStatusBadge } from '../../components/outbound-message-status-badge';
import { useCooldownTick } from '../../components/use-cooldown-tick';
import { type IntegrationCatalogEntry, INTEGRATION_CATALOG } from '../catalog';
import { IntegrationStatusBadge } from './integration-status-badge';

const MESSAGES_PAGE_SIZE = 20;
// Deliveries happen async in the worker — give it a moment before refreshing.
const LOG_REFRESH_DELAY_MS = 1500;

/**
 * Card header shared by both sections — same chrome as the webhook detail so
 * the two outbound surfaces read as one system.
 */
const CardHeading = ({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) => (
  <>
    <div className="space-y-2">
      <div className="flex h-10 flex-row items-center justify-between gap-4">
        <h3 className="flex items-center gap-3 text-xl font-medium tracking-tight">{title}</h3>
        {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    <Separator />
  </>
);

/** The key is required only on first configure — afterwards blank = keep. */
const buildConfigFormSchema = (isConfigured: boolean) =>
  z.object({
    key: isConfigured ? z.string().max(500) : z.string().trim().min(1, 'keyRequired').max(500),
    region: z.enum(['US', 'EU']),
  });

type ConfigFormValues = z.infer<ReturnType<typeof buildConfigFormSchema>>;

const valuesFromIntegration = (integration: Integration | undefined): ConfigFormValues => ({
  key: '',
  region: integration?.config?.region === 'EU' ? 'EU' : 'US',
});

/**
 * Identity card: who this provider is — logo, name, live status, the removal
 * action, and (once the docs exist) the provider guide link. Mirrors the
 * capability-card layout: identity up top, one card per capability below.
 */
const IdentitySection = ({
  entry,
  integration,
}: {
  entry: IntegrationCatalogEntry;
  integration: Integration | undefined;
}) => {
  const { isViewOnly, project } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { invoke: deleteIntegration, loading: deleting } = useDeleteIntegrationMutation();

  const handleDelete = async () => {
    if (!integration) {
      return;
    }
    try {
      const removed = await deleteIntegration(integration.id);
      if (removed) {
        toast({ variant: 'success', title: t('settings.integrations.delete.success') });
        navigate(`/project/${project?.id}/settings/integrations`);
      } else {
        toast({ variant: 'destructive', title: t('settings.integrations.delete.failure') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <img
          className="h-12 w-12 rounded-lg border border-accent-light object-cover"
          src={entry.imagePath}
          alt={t('settings.integrations.catalog.logoAlt', { name: entry.name })}
        />
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-medium tracking-tight">{entry.name}</h3>
            <IntegrationStatusBadge integration={integration} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`settings.integrations.catalog.descriptions.${entry.provider}`)}
          </p>
        </div>
      </div>
      {integration && (
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={isViewOnly || deleting}
          onClick={() => setDeleteOpen(true)}
        >
          {t('settings.integrations.delete.button')}
        </Button>
      )}

      <DestructiveConfirmDialog
        title={t('settings.integrations.delete.confirmTitle')}
        description={t('settings.integrations.delete.confirmDescription', { name: entry.name })}
        confirmLabel={t('settings.integrations.delete.confirmButton')}
        cancelLabel={t('settings.common.cancel')}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
};

/**
 * Outbound capability card: the streaming switch (commits immediately) and
 * the credential/region form (explicit Save). The inbound cohort-sync card
 * will sit beside this one as a sibling capability.
 */
const OutboundSection = ({
  entry,
  integration,
  environmentId,
  entitled,
}: {
  entry: IntegrationCatalogEntry;
  integration: Integration | undefined;
  environmentId: string;
  entitled: boolean;
}) => {
  const { isViewOnly } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { invoke: upsertIntegration, loading: saving } = useUpsertIntegrationMutation();
  // Separate mutation instance so the toggle's pending state doesn't put the
  // Save button into a spinner (and vice versa).
  const { invoke: toggleIntegration, loading: toggling } = useUpsertIntegrationMutation();
  const isConfigured = !!integration;
  const canWrite = !isViewOnly && entitled;

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(buildConfigFormSchema(isConfigured)),
    defaultValues: valuesFromIntegration(integration),
    mode: 'onChange',
  });

  // Re-seed when the row settles or changes identity (first configure, cache
  // refresh after save). Keyed on id + updatedAt: the key field deliberately
  // stays blank ("" = keep the stored key), so a reset never clobbers a draft
  // credential mid-typing unless the row itself moved.
  const rowStamp = integration ? `${integration.id}:${integration.updatedAt}` : 'unconfigured';
  useEffect(() => {
    form.reset(valuesFromIntegration(integration));
  }, [rowStamp, form]);

  const handleSubmit = async (values: ConfigFormValues) => {
    try {
      const key = values.key.trim();
      // Send `config` only on first configure or an actual region change: the
      // server treats a config write as a destination change and resets the
      // circuit breaker — a plain enabled flip must not clear the streak.
      const storedRegion = integration?.config?.region === 'EU' ? 'EU' : 'US';
      const regionChanged = !integration || storedRegion !== values.region;
      const saved = await upsertIntegration({
        environmentId,
        provider: entry.provider,
        ...(key ? { key } : {}),
        ...(entry.hasRegion && regionChanged
          ? { config: { region: values.region as IntegrationRegion } }
          : {}),
      });
      if (saved) {
        form.setValue('key', '');
        toast({ variant: 'success', title: t('settings.integrations.form.saved') });
      } else {
        toast({ variant: 'destructive', title: t('settings.integrations.form.saveFailed') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  // The switch commits immediately (one field, one write) — the capability
  // card's own control, independent of the form below.
  const handleToggle = async (next: boolean) => {
    try {
      const saved = await toggleIntegration({
        environmentId,
        provider: entry.provider,
        enabled: next,
      });
      if (saved) {
        // The switch commits without a Save click — say so, or the Save
        // button below teaches users to doubt whether the flip stuck.
        toast({
          variant: 'success',
          title: next
            ? t('settings.integrations.outbound.enabledToast')
            : t('settings.integrations.outbound.disabledToast'),
        });
      } else {
        toast({ variant: 'destructive', title: t('settings.integrations.outbound.toggleFailed') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Switch
          // bg-input track — same treatment as the identity-verification
          // enforcement switch (the default variant's unchecked track is
          // bg-background, invisible on this white page).
          className="shrink-0 data-[state=unchecked]:bg-input"
          checked={integration?.enabled ?? false}
          disabled={!canWrite || !isConfigured || toggling}
          title={
            isConfigured ? undefined : t('settings.integrations.outbound.toggleConfigureFirst')
          }
          onCheckedChange={(next) => void handleToggle(next)}
        />
        <span className={cn('text-base font-medium', !isConfigured && 'text-muted-foreground')}>
          {t('settings.integrations.outbound.toggle', { name: entry.name })}
        </span>
        <QuestionTooltip>
          {t('settings.integrations.outbound.toggleTooltip', { name: entry.name })}
        </QuestionTooltip>
      </div>
      {integration?.autoDisabledAt && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t('settings.integrations.autoDisabled.banner', {
            time: format(new Date(integration.autoDisabledAt), 'PP'),
          })}
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4">
          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(`settings.integrations.form.keyLabels.${entry.provider}`)}</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    placeholder={
                      isConfigured
                        ? `••••••••${integration.keyTail}`
                        : t(`settings.integrations.form.keyPlaceholders.${entry.provider}`)
                    }
                    {...field}
                  />
                </FormControl>
                {form.formState.errors.key ? (
                  <p className="text-[0.8rem] font-medium text-destructive">
                    {t('settings.integrations.form.keyRequired')}
                  </p>
                ) : (
                  isConfigured && (
                    <FormDescription>
                      {t('settings.integrations.form.keyConfiguredHint')}
                    </FormDescription>
                  )
                )}
              </FormItem>
            )}
          />

          {entry.hasRegion && (
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.integrations.form.regionLabel')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-52">
                        {field.value === 'EU'
                          ? t('settings.integrations.form.regionEU')
                          : t('settings.integrations.form.regionUS')}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="US">{t('settings.integrations.form.regionUS')}</SelectItem>
                      <SelectItem value="EU">{t('settings.integrations.form.regionEU')}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}

          <Button type="submit" disabled={!canWrite || saving}>
            {saving && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.integrations.form.save')}
          </Button>
        </form>
      </Form>
    </div>
  );
};

const MessagesSection = ({
  integrationId,
  enabled,
  entitled,
}: {
  integrationId: string;
  enabled: boolean;
  entitled: boolean;
}) => {
  // Load-more accumulation, same wiring as the webhook message log.
  const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
  // `selected` is retained after close so the dialog can animate out with its
  // content still mounted; `dialogOpen` alone drives visibility.
  const [selected, setSelected] = useState<OutboundMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const page = useQueryIntegrationMessagesQuery(integrationId, {
    first: MESSAGES_PAGE_SIZE,
    after: afterCursor,
  });
  const {
    items: messages,
    hasMore,
    loading,
    loadMore,
    refresh,
  } = useLoadMoreAccumulator<OutboundMessage>({
    pageItems: page.messages,
    pageInfo: page.pageInfo as PageInfo | undefined,
    pageTotalCount: page.totalCount ?? 0,
    pageLoading: page.loading,
    pageRefetch: page.refetch,
    afterCursor,
    setAfterCursor,
    resetKey: integrationId,
    getId: (message) => message.id,
  });
  const { invoke: sendTestEvent, loading: sendingTest } = useSendIntegrationTestEventMutation();
  const { isViewOnly } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Keep the open dialog in sync with refetched rows (attempts arrive async).
  const selectedMessage = selected
    ? (messages.find((message) => message.id === selected.id) ?? selected)
    : null;

  // Timer is tracked so unmount cancels the pending refresh.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    },
    [],
  );
  const refetchSoon = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => refresh(), LOG_REFRESH_DELAY_MS);
  };

  const handleSendTest = async () => {
    try {
      const sent = await sendTestEvent(integrationId);
      if (sent) {
        toast({ variant: 'success', title: t('settings.integrations.testEvent.sent') });
        refetchSoon();
      } else {
        toast({ variant: 'destructive', title: t('settings.integrations.testEvent.failed') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const lastAttempt = (message: OutboundMessage) =>
    message.deliveries.length > 0 ? message.deliveries[message.deliveries.length - 1] : null;

  return (
    <div className="space-y-6">
      <CardHeading
        title={t('settings.integrations.messages.title')}
        description={t('settings.integrations.messages.description')}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              disabled={loading}
              title={t('settings.integrations.messages.refresh')}
              aria-label={t('settings.integrations.messages.refresh')}
              onClick={() => refresh()}
            >
              <RiRefreshLine className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button
              variant="outline"
              disabled={isViewOnly || !enabled || !entitled || sendingTest}
              title={enabled ? undefined : t('settings.integrations.testEvent.disabledHint')}
              onClick={() => void handleSendTest()}
            >
              {sendingTest ? (
                <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RiSendPlaneLine className="mr-2 h-4 w-4" />
              )}
              {t('settings.integrations.testEvent.button')}
            </Button>
          </>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48 whitespace-nowrap">
              {t('settings.outbound.columns.time')}
            </TableHead>
            <TableHead>{t('settings.outbound.columns.topic')}</TableHead>
            <TableHead className="w-28 whitespace-nowrap">
              {t('settings.outbound.columns.status')}
            </TableHead>
            <TableHead className="w-24 whitespace-nowrap">
              {t('settings.outbound.columns.attempts')}
            </TableHead>
            <TableHead className="w-28 whitespace-nowrap">
              {t('settings.outbound.columns.lastResponse')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                {t('settings.integrations.messages.empty')}
              </TableCell>
            </TableRow>
          )}
          {messages.map((message) => {
            const last = lastAttempt(message);
            return (
              <TableRow
                key={message.id}
                className="cursor-pointer"
                onClick={() => {
                  setSelected(message);
                  setDialogOpen(true);
                }}
              >
                <TableCell className="whitespace-nowrap">
                  {format(new Date(message.createdAt), 'PP pp')}
                </TableCell>
                <TableCell className="max-w-56 truncate font-mono text-xs" title={message.topic}>
                  {message.topic}
                </TableCell>
                <TableCell>
                  <OutboundMessageStatusBadge status={message.status} />
                </TableCell>
                <TableCell>{message.deliveries.length}</TableCell>
                <TableCell className="text-muted-foreground">
                  {last
                    ? (last.responseStatus ??
                      (last.success
                        ? t('settings.outbound.responseOk')
                        : t('settings.outbound.responseError')))
                    : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {hasMore && (
        <div className="flex justify-center">
          <LoadingButton variant="outline" loading={loading} onClick={loadMore}>
            {t('settings.integrations.messages.loadMore')}
          </LoadingButton>
        </div>
      )}

      <OutboundMessageDialog
        open={dialogOpen}
        message={selectedMessage}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

export const IntegrationDetail = () => {
  const { settingSubType: provider } = useParams();
  const { environment, project } = useAppContext();
  const { projectConfig, loading: configLoading } = useGetProjectConfigQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { integrations, loading } = useListIntegrationsQuery(
    environment?.id ?? '',
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { t } = useTranslation();
  const entry = INTEGRATION_CATALOG.find((candidate) => candidate.provider === provider);
  const integration = integrations?.find((row) => row.provider === provider);
  // Drop the "Cooling down" badge on schedule, not on the next refetch.
  useCooldownTick([integration?.cooldownUntil]);

  // Plan gate mirror (server enforces independently): reads and delete stay
  // open on a downgraded project; save / test are write-shaped. Optimistic
  // while settling — see the list page.
  const rawEntitled = !projectConfig || projectConfig.integrations;
  const entitled =
    (loading && !integrations) || (configLoading && !projectConfig) ? true : rawEntitled;

  if (!entry) {
    return (
      <SettingsCardStack>
        <SettingsCard>
          <p className="text-sm text-muted-foreground">{t('settings.integrations.notFound')}</p>
        </SettingsCard>
      </SettingsCardStack>
    );
  }
  if (loading && !integrations) {
    return null;
  }

  return (
    <SettingsCardStack>
      <SettingsCard>
        {!entitled && (
          <div className="mb-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {t('settings.integrations.downgraded.banner')}
          </div>
        )}
        <IdentitySection entry={entry} integration={integration} />
      </SettingsCard>

      <SettingsCard>
        <OutboundSection
          entry={entry}
          integration={integration}
          environmentId={environment?.id ?? ''}
          entitled={entitled}
        />
      </SettingsCard>

      {integration && (
        <SettingsCard>
          <MessagesSection
            integrationId={integration.id}
            enabled={integration.enabled}
            entitled={entitled}
          />
        </SettingsCard>
      )}
    </SettingsCardStack>
  );
};

IntegrationDetail.displayName = 'IntegrationDetail';
