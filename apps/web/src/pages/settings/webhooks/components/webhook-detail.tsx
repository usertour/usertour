import { type ReactNode, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import {
  type Webhook,
  type WebhookMessage,
  useGetProjectConfigQuery,
  useGetWebhookQuery,
  useQueryWebhookMessagesQuery,
  useResendWebhookMessageMutation,
  useRotateWebhookSecretMutation,
  useSendWebhookTestEventMutation,
} from '@usertour/hooks';
import {
  ArrowRightLeftIcon,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiSendPlaneLine,
  SpinnerIcon,
} from '@usertour/icons';
import {
  Badge,
  Button,
  LoadingButton,
  DestructiveConfirmDialog,
  Input,
  Separator,
  SettingsCard,
  SettingsCardStack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import type { PageInfo } from '@usertour/types';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { useLoadMoreAccumulator } from '@/hooks/use-load-more-accumulator';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { useCooldownTick } from './use-cooldown-tick';
import { WebhookMessageDialog } from './webhook-message-dialog';
import { WebhookMessageStatusBadge } from './webhook-message-status-badge';

const MESSAGES_PAGE_SIZE = 20;
// Deliveries happen async in the worker — give it a moment before refreshing.
const LOG_REFRESH_DELAY_MS = 1500;

const MASKED_SECRET = 'whsec_••••••••••••••••••••••••••••••••';

/**
 * Card header shared by the three sections: h3 title + optional right-side
 * action, optional body copy, then a separator — the same chrome as the other
 * settings cards (SSO, account) so the page reads as one system.
 */
const CardHeading = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <>
    <div className="space-y-2">
      <div className="flex h-10 flex-row items-center justify-between gap-4">
        <h3 className="text-xl font-medium tracking-tight">{title}</h3>
        {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    <Separator />
  </>
);

/** Label / value row of the endpoint overview grid. */
const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[9rem_1fr] items-start gap-4 text-sm">
    <dt className="pt-0.5 text-muted-foreground">{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </div>
);

const OverviewSection = ({ webhook }: { webhook: Webhook }) => {
  const { t } = useTranslation();
  const copy = useCopyWithToast();

  return (
    <div className="space-y-6">
      <CardHeading
        title={t('settings.webhooks.detail.title')}
        actions={
          !webhook.enabled ? (
            webhook.autoDisabledAt ? (
              <Badge variant="destructive">{t('settings.webhooks.autoDisabled.badge')}</Badge>
            ) : (
              <Badge variant="secondary">{t('settings.webhooks.statusDisabled')}</Badge>
            )
          ) : webhook.cooldownUntil && new Date(webhook.cooldownUntil).getTime() > Date.now() ? (
            <Badge variant="warning">
              {t('settings.webhooks.cooldown.badgeUntil', {
                time: format(new Date(webhook.cooldownUntil), 'pp'),
              })}
            </Badge>
          ) : (
            <Badge variant="success">{t('settings.webhooks.statusEnabled')}</Badge>
          )
        }
      />
      {webhook.autoDisabledAt && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {t('settings.webhooks.autoDisabled.banner', {
            time: format(new Date(webhook.autoDisabledAt), 'PP'),
          })}
        </div>
      )}
      <dl className="space-y-4">
        <DetailRow label={t('settings.webhooks.form.url')}>
          <div className="flex items-start gap-2">
            <code className="min-w-0 break-all rounded bg-muted px-2 py-1 font-mono text-xs leading-5">
              {webhook.url}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => copy(webhook.url, t('settings.webhooks.detail.urlCopied'))}
              title={t('settings.webhooks.detail.copyUrl')}
            >
              <RiFileCopyLine className="h-4 w-4" />
            </Button>
          </div>
        </DetailRow>
        {webhook.description ? (
          <DetailRow label={t('settings.webhooks.detail.description')}>
            {webhook.description}
          </DetailRow>
        ) : null}
        <DetailRow label={t('settings.webhooks.form.topics')}>
          <div className="flex flex-wrap gap-1.5">
            {webhook.topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="font-mono text-xs font-normal">
                {topic}
              </Badge>
            ))}
          </div>
        </DetailRow>
        <DetailRow label={t('settings.webhooks.columns.createdAt')}>
          {format(new Date(webhook.createdAt), 'PP pp')}
        </DetailRow>
      </dl>
    </div>
  );
};

const SigningSecretSection = ({
  webhookId,
  secret,
  entitled,
}: {
  webhookId: string;
  /** Plaintext, or '' = stored value undecryptable; null/undefined = not provided (masked row). */
  secret: string | null | undefined;
  entitled: boolean;
}) => {
  const [revealed, setRevealed] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const { isViewOnly } = useAppContext();
  const { invoke: rotateSecret, loading: isRotating } = useRotateWebhookSecretMutation();
  const copy = useCopyWithToast();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleRotate = async () => {
    try {
      const rotated = await rotateSecret(webhookId);
      if (rotated) {
        setRotateOpen(false);
        setRevealed(true);
        toast({ variant: 'success', title: t('settings.webhooks.secret.rotateSuccess') });
      } else {
        toast({ variant: 'destructive', title: t('settings.webhooks.secret.rotateFailure') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-6">
      <CardHeading
        title={t('settings.webhooks.secret.label')}
        description={t('settings.webhooks.secret.hint')}
      />
      {secret === '' && (
        <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('settings.webhooks.secret.undecryptable')}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={secret ? (revealed ? secret : MASKED_SECRET) : '—'}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={!secret}
          onClick={() => setRevealed((current) => !current)}
          title={t('settings.webhooks.secret.revealButton')}
        >
          {revealed ? <RiEyeOffLine className="h-4 w-4" /> : <RiEyeLine className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={!secret}
          onClick={() => copy(secret ?? '', t('settings.webhooks.secret.copied'))}
          title={t('settings.webhooks.secret.copyButton')}
        >
          <RiFileCopyLine className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={isViewOnly || !entitled}
          onClick={() => setRotateOpen(true)}
          title={t('settings.webhooks.secret.rotateButton')}
        >
          <ArrowRightLeftIcon className="h-4 w-4" />
        </Button>
      </div>

      <DestructiveConfirmDialog
        title={t('settings.webhooks.secret.rotateConfirmTitle')}
        description={t('settings.webhooks.secret.rotateConfirmDescription')}
        confirmLabel={t('settings.webhooks.secret.rotateConfirmButton')}
        cancelLabel={t('settings.common.cancel')}
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        onConfirm={handleRotate}
        loading={isRotating}
      />
    </div>
  );
};

const MessagesSection = ({
  webhookId,
  enabled,
  entitled,
}: { webhookId: string; enabled: boolean; entitled: boolean }) => {
  // Load-more accumulation (docs/conventions/list-pagination.md: a card on a
  // longer page gets a button, not infinite scroll). The query returns one
  // page; the accumulator appends on cursor advance and `refresh` resets to
  // page 1 — the earlier cursor-only wiring REPLACED the list with each page.
  const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined);
  // `selected` is retained after close so the dialog can animate out with its
  // content still mounted; `dialogOpen` alone drives visibility.
  const [selected, setSelected] = useState<WebhookMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const page = useQueryWebhookMessagesQuery(webhookId, {
    first: MESSAGES_PAGE_SIZE,
    after: afterCursor,
  });
  const {
    items: messages,
    hasMore,
    loading,
    loadMore,
    refresh,
  } = useLoadMoreAccumulator<WebhookMessage>({
    pageItems: page.messages,
    pageInfo: page.pageInfo as PageInfo | undefined,
    pageTotalCount: page.totalCount ?? 0,
    pageLoading: page.loading,
    pageRefetch: page.refetch,
    afterCursor,
    setAfterCursor,
    resetKey: webhookId,
    getId: (message) => message.id,
  });
  const { invoke: sendTestEvent, loading: sendingTest } = useSendWebhookTestEventMutation();
  const { invoke: resendMessage, loading: resending } = useResendWebhookMessageMutation();
  const { isViewOnly } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Keep the open dialog in sync with refetched rows (attempts arrive async).
  const selectedMessage = selected
    ? (messages.find((message) => message.id === selected.id) ?? selected)
    : null;

  // Timer is tracked so unmount cancels the pending refresh (a fire-and-
  // forget setTimeout would refetch into an unmounted accumulator).
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
      const sent = await sendTestEvent(webhookId);
      if (sent) {
        toast({ variant: 'success', title: t('settings.webhooks.testEvent.sent') });
        refetchSoon();
      } else {
        toast({ variant: 'destructive', title: t('settings.webhooks.testEvent.failed') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const handleResend = async (message: WebhookMessage) => {
    try {
      const queued = await resendMessage(webhookId, message.id);
      if (queued) {
        toast({ variant: 'success', title: t('settings.webhooks.message.resendQueued') });
        // Only the DELAYED refresh: an immediate one is guaranteed to see the
        // pre-resend state, and it folds any loaded pages back to page one.
        refetchSoon();
      } else {
        toast({ variant: 'destructive', title: t('settings.webhooks.message.resendFailed') });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: getErrorMessage(error) });
    }
  };

  const lastAttempt = (message: WebhookMessage) =>
    message.deliveries.length > 0 ? message.deliveries[message.deliveries.length - 1] : null;

  return (
    <div className="space-y-6">
      <CardHeading
        title={t('settings.webhooks.deliveries.title')}
        description={t('settings.webhooks.deliveries.description')}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              disabled={loading}
              title={t('settings.webhooks.deliveries.refresh')}
              aria-label={t('settings.webhooks.deliveries.refresh')}
              onClick={() => refresh()}
            >
              <RiRefreshLine className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button
              variant="outline"
              disabled={isViewOnly || !enabled || !entitled || sendingTest}
              title={enabled ? undefined : t('settings.webhooks.testEvent.disabledHint')}
              onClick={() => void handleSendTest()}
            >
              {sendingTest ? (
                <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RiSendPlaneLine className="mr-2 h-4 w-4" />
              )}
              {t('settings.webhooks.testEvent.button')}
            </Button>
          </>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">{t('settings.webhooks.deliveries.columns.time')}</TableHead>
            <TableHead>{t('settings.webhooks.deliveries.columns.topic')}</TableHead>
            <TableHead className="w-28">
              {t('settings.webhooks.deliveries.columns.status')}
            </TableHead>
            <TableHead className="w-24">
              {t('settings.webhooks.deliveries.columns.attempts')}
            </TableHead>
            <TableHead className="w-28">
              {t('settings.webhooks.deliveries.columns.lastResponse')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                {t('settings.webhooks.deliveries.empty')}
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
                <TableCell className="font-mono text-xs">{message.topic}</TableCell>
                <TableCell>
                  <WebhookMessageStatusBadge status={message.status} />
                </TableCell>
                <TableCell>{message.deliveries.length}</TableCell>
                <TableCell className="text-muted-foreground">
                  {last
                    ? (last.responseStatus ??
                      (last.success
                        ? t('settings.webhooks.responseOk')
                        : t('settings.webhooks.responseError')))
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
            {t('settings.webhooks.deliveries.loadMore')}
          </LoadingButton>
        </div>
      )}

      <WebhookMessageDialog
        open={dialogOpen}
        message={selectedMessage}
        onClose={() => setDialogOpen(false)}
        onResend={(message) => void handleResend(message)}
        resending={resending}
        canResend={!isViewOnly && enabled && entitled}
      />
    </div>
  );
};

export const WebhookDetail = () => {
  const { settingSubType: webhookId } = useParams();
  const { project } = useAppContext();
  const { projectConfig } = useGetProjectConfigQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
  // Cache-connected (repo default is no-cache with per-query opt-in): rotate
  // and update merge their returned fields into Webhook:<id>, and this watch
  // query must be ON the cache to see them — without this, the new secret
  // only appeared after a full page reload.
  const { webhook, loading } = useGetWebhookQuery(webhookId ?? '', SHARED_CACHE_QUERY_OPTIONS);
  // Drop the "Cooling down" badge on schedule, not on the next refetch.
  useCooldownTick([webhook?.cooldownUntil]);
  const { t } = useTranslation();
  // Plan gate mirror (server enforces independently): reads and delete stay
  // open on a downgraded project; rotate / test / resend are write-shaped.
  const entitled = !projectConfig || projectConfig.webhooks;

  if (loading && !webhook) {
    return null;
  }

  if (!webhook) {
    return (
      <SettingsCardStack>
        <SettingsCard>
          <p className="text-sm text-muted-foreground">{t('settings.webhooks.notFound')}</p>
        </SettingsCard>
      </SettingsCardStack>
    );
  }

  return (
    <SettingsCardStack>
      <SettingsCard>
        {!entitled && (
          <div className="mb-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {t('settings.webhooks.downgraded.banner')}
          </div>
        )}
        <OverviewSection webhook={webhook} />
      </SettingsCard>

      {/* Always rendered — '' means "stored secret can no longer be
          decrypted" (encryption key changed), and hiding this card would
          hide the Rotate button, the one self-heal path. */}
      <SettingsCard>
        <SigningSecretSection webhookId={webhook.id} secret={webhook.secret} entitled={entitled} />
      </SettingsCard>

      <SettingsCard>
        <MessagesSection webhookId={webhook.id} enabled={webhook.enabled} entitled={entitled} />
      </SettingsCard>
    </SettingsCardStack>
  );
};

WebhookDetail.displayName = 'WebhookDetail';
