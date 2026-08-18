import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { getErrorMessage } from '@usertour/helpers';
import {
  type Webhook,
  type WebhookMessage,
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
import { useAppContext } from '@/contexts/app-context';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
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
          webhook.enabled ? (
            <Badge variant="success">{t('settings.webhooks.statusEnabled')}</Badge>
          ) : (
            <Badge variant="secondary">{t('settings.webhooks.statusDisabled')}</Badge>
          )
        }
      />
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

const SigningSecretSection = ({ webhookId, secret }: { webhookId: string; secret: string }) => {
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
      <div className="flex items-center gap-2">
        <Input readOnly value={revealed ? secret : MASKED_SECRET} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
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
          onClick={() => copy(secret, t('settings.webhooks.secret.copied'))}
          title={t('settings.webhooks.secret.copyButton')}
        >
          <RiFileCopyLine className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={isViewOnly}
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

const MessagesSection = ({ webhookId, enabled }: { webhookId: string; enabled: boolean }) => {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<WebhookMessage | null>(null);
  const { messages, pageInfo, loading, refetch, isRefetching } = useQueryWebhookMessagesQuery(
    webhookId,
    { first: MESSAGES_PAGE_SIZE, after: cursor },
  );
  const { invoke: sendTestEvent, loading: sendingTest } = useSendWebhookTestEventMutation();
  const { invoke: resendMessage, loading: resending } = useResendWebhookMessageMutation();
  const { isViewOnly } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Keep the open dialog in sync with refetched rows (attempts arrive async).
  const selectedMessage = selected
    ? (messages.find((message) => message.id === selected.id) ?? selected)
    : null;

  const refetchSoon = () => {
    setTimeout(() => void refetch(), LOG_REFRESH_DELAY_MS);
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
        void refetch();
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
              disabled={isRefetching}
              title={t('settings.webhooks.deliveries.refresh')}
              aria-label={t('settings.webhooks.deliveries.refresh')}
              onClick={() => void refetch()}
            >
              <RiRefreshLine className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
            </Button>
            <Button
              variant="outline"
              disabled={isViewOnly || !enabled || sendingTest}
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
                onClick={() => setSelected(message)}
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
                  {last ? (last.responseStatus ?? (last.success ? 'OK' : 'ERR')) : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {pageInfo?.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setCursor(pageInfo.endCursor ?? undefined)}
        >
          {t('settings.webhooks.deliveries.loadMore')}
        </Button>
      )}

      <WebhookMessageDialog
        message={selectedMessage}
        onClose={() => setSelected(null)}
        onResend={(message) => void handleResend(message)}
        resending={resending}
        canResend={!isViewOnly && enabled}
      />
    </div>
  );
};

export const WebhookDetail = () => {
  const { settingSubType: webhookId } = useParams();
  const { webhook, loading } = useGetWebhookQuery(webhookId ?? '');
  const { t } = useTranslation();

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
        <OverviewSection webhook={webhook} />
      </SettingsCard>

      {webhook.secret && (
        <SettingsCard>
          <SigningSecretSection webhookId={webhook.id} secret={webhook.secret} />
        </SettingsCard>
      )}

      <SettingsCard>
        <MessagesSection webhookId={webhook.id} enabled={webhook.enabled} />
      </SettingsCard>
    </SettingsCardStack>
  );
};

WebhookDetail.displayName = 'WebhookDetail';
