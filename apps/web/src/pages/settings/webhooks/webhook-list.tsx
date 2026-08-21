import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { WEBHOOK_EVENT_TOPIC_PREFIX, WEBHOOK_TOPIC_WILDCARD } from '@usertour/constants';
import { type Webhook, useGetProjectConfigQuery, useListWebhooksQuery } from '@usertour/hooks';
import { Badge, NewItemButton, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { useCooldownTick } from './components/use-cooldown-tick';
import { WebhookDialog } from './components/webhook-dialog';
import { WebhookRowActions } from './components/webhook-row-actions';
import { WebhookUpsell } from './components/webhook-upsell';

const WEBHOOKS_DOCS_HREF = 'https://docs.usertour.io/developers/webhooks';

/** Cooling down = breaker armed with a window still in the future. */
const isCoolingDown = (webhook: Webhook): boolean =>
  !!webhook.cooldownUntil && new Date(webhook.cooldownUntil).getTime() > Date.now();

// No onSubmit refetch: the create mutation's refetchQueries already refreshes
// the list; a second manual refetch doubled the request.
const NewWebhookButton = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <NewItemButton onClick={() => setOpen(true)} label={t('settings.webhooks.newButton')} />
      <WebhookDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export const SettingsWebhookList = () => {
  const { environment, project } = useAppContext();
  const { projectConfig, loading: configLoading } = useGetProjectConfigQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { webhooks, loading } = useListWebhooksQuery(
    environment?.id ?? '',
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { t } = useTranslation();
  // Drop the "Cooling down" badge on schedule, not on the next refetch.
  useCooldownTick((webhooks ?? []).map((webhook) => webhook.cooldownUntil));

  // Plan gate — the server enforces this independently; mirror it in the UI.
  // A downgraded project with EXISTING endpoints keeps a degraded list (the
  // server deliberately leaves reads and deletes open so old configuration
  // can be inspected and cleaned up); the full-page upsell is only for
  // projects with nothing to show.
  const entitled = !projectConfig || projectConfig.webhooks;
  if (!entitled && !loading && (webhooks?.length ?? 0) === 0) {
    return <WebhookUpsell projectId={project?.id} environmentName={environment?.name ?? ''} />;
  }

  const topicsSummary = (webhook: Webhook): string => {
    if (webhook.topics.includes(WEBHOOK_TOPIC_WILDCARD)) {
      return t('settings.webhooks.allEventsSummary');
    }
    if (webhook.topics.includes(WEBHOOK_EVENT_TOPIC_PREFIX)) {
      const extra = webhook.topics.length - 1;
      return extra > 0
        ? t('settings.webhooks.allTrackedEventsPlus', { count: extra })
        : t('settings.webhooks.allTrackedEventsSummary');
    }
    return t('settings.webhooks.topicsCount', { count: webhook.topics.length });
  };

  const columns: ResourceTableColumn<Webhook>[] = [
    {
      header: t('settings.webhooks.columns.url'),
      className: 'truncate max-w-96',
      cell: (webhook) => (
        <Link
          to={`/project/${project?.id}/settings/webhooks/${webhook.id}`}
          className="text-primary hover:underline"
          title={webhook.url}
        >
          {webhook.url}
        </Link>
      ),
    },
    {
      header: t('settings.webhooks.columns.topics'),
      className: 'truncate',
      cell: (webhook) => topicsSummary(webhook),
    },
    {
      header: t('settings.webhooks.columns.status'),
      headerClassName: 'w-28',
      cell: (webhook) => {
        if (!webhook.enabled) {
          return webhook.autoDisabledAt ? (
            <Badge
              variant="destructive"
              className="whitespace-nowrap"
              title={t('settings.webhooks.autoDisabled.tooltip', {
                time: format(new Date(webhook.autoDisabledAt), 'PP'),
              })}
            >
              {t('settings.webhooks.autoDisabled.badge')}
            </Badge>
          ) : (
            <Badge variant="secondary">{t('settings.webhooks.statusDisabled')}</Badge>
          );
        }
        if (isCoolingDown(webhook)) {
          return (
            <Badge
              variant="warning"
              className="whitespace-nowrap"
              title={t('settings.webhooks.cooldown.tooltip', {
                count: webhook.consecutiveFailures,
                time: format(new Date(webhook.cooldownUntil as string), 'pp'),
              })}
            >
              {t('settings.webhooks.cooldown.badge')}
            </Badge>
          );
        }
        return <Badge variant="success">{t('settings.webhooks.statusEnabled')}</Badge>;
      },
    },
    {
      header: t('settings.webhooks.columns.createdAt'),
      headerClassName: 'w-48 hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (webhook) => format(new Date(webhook.createdAt), 'PPpp'),
    },
    {
      header: '',
      headerClassName: 'w-20',
      cell: (webhook) => <WebhookRowActions webhook={webhook} entitled={entitled} />,
    },
  ];

  return (
    <ResourceListPage<Webhook>
      title={t('settings.webhooks.title', { environment: environment?.name ?? '' })}
      actions={entitled ? <NewWebhookButton /> : undefined}
      description={
        entitled ? (
          t('settings.webhooks.headerBody')
        ) : (
          <span className="text-amber-600">{t('settings.webhooks.downgraded.banner')}</span>
        )
      }
      docs={{
        href: WEBHOOKS_DOCS_HREF,
        label: t('settings.common.readGuide', { topic: t('settings.nav.sections.webhooks') }),
      }}
      columns={columns}
      rows={webhooks}
      loading={(loading && !webhooks) || !environment || (configLoading && !projectConfig)}
      empty={t('settings.webhooks.empty')}
      getRowKey={(webhook) => webhook.id}
    />
  );
};

SettingsWebhookList.displayName = 'SettingsWebhookList';
