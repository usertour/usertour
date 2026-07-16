import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { type Webhook, useListWebhooksQuery } from '@usertour/hooks';
import { Badge, NewItemButton, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { WebhookDialog } from './components/webhook-dialog';
import { WebhookRowActions } from './components/webhook-row-actions';

const EVENT_TOPIC_PREFIX = 'event.tracked';

const NewWebhookButton = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <NewItemButton onClick={() => setOpen(true)} label={t('settings.webhooks.newButton')} />
      <WebhookDialog open={open} onOpenChange={setOpen} onSubmit={() => onSuccess()} />
    </>
  );
};

export const SettingsWebhookList = () => {
  const { environment, project } = useAppContext();
  const { webhooks, loading, refetch } = useListWebhooksQuery(
    environment?.id ?? '',
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const { t } = useTranslation();

  const topicsSummary = (webhook: Webhook): string => {
    if (webhook.topics.includes('*') || webhook.topics.includes(EVENT_TOPIC_PREFIX)) {
      return t('settings.webhooks.allEventsSummary');
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
      cell: (webhook) =>
        webhook.enabled ? (
          <Badge variant="success">{t('settings.webhooks.statusEnabled')}</Badge>
        ) : (
          <Badge variant="secondary">{t('settings.webhooks.statusDisabled')}</Badge>
        ),
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
      cell: (webhook) => <WebhookRowActions webhook={webhook} />,
    },
  ];

  return (
    <ResourceListPage<Webhook>
      title={t('settings.webhooks.title', { environment: environment?.name ?? '' })}
      actions={<NewWebhookButton onSuccess={refetch} />}
      description={t('settings.webhooks.headerBody')}
      columns={columns}
      rows={webhooks}
      loading={loading || !environment}
      empty={t('settings.webhooks.empty')}
      getRowKey={(webhook) => webhook.id}
    />
  );
};

SettingsWebhookList.displayName = 'SettingsWebhookList';
