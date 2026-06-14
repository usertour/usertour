import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { Badge, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { SpinnerIcon } from '@usertour/icons';
import { type AuditLog, useGetProjectConfigQuery, useListAuditLogsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { useScrollRoot } from '@/contexts/scroll-root-context';
import { AuditDetailDialog } from './components/audit-detail-dialog';
import { AuditLogUpsell } from './components/audit-log-upsell';
import { actorLabel, resourceLabel } from './format';

/**
 * Owner-only Activity / audit-log page: who changed/deleted what, when, and from
 * which surface (mcp vs api). Read-only; the list itself is never audited.
 *
 * Paid feature: viewing needs cloud Business+ or a self-host license
 * (`projectConfig.auditLogs`). Locked → upsell; the read query is also skipped so
 * the server's independent gate never errors a non-entitled fetch.
 */
export const AuditLogList = () => {
  const { project, globalConfig } = useAppContext();
  const { projectConfig, loading: configLoading } = useGetProjectConfigQuery(
    project?.id,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const entitled = projectConfig?.auditLogs ?? false;

  const { auditLogs, loading, loadingMore, hasNextPage, fetchNextPage } = useListAuditLogsQuery(
    project?.id,
    { ...SHARED_CACHE_QUERY_OPTIONS, skip: !entitled },
  );
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AuditLog | null>(null);

  // Sentinel-driven infinite scroll. `rootRef` must point at the settings
  // ScrollArea Viewport (published by AdminSettingsLayout) — otherwise the IO
  // measures against the window and never fires inside the inner scroll.
  const scrollRoot = useScrollRoot();
  const [sentryRef, { rootRef }] = useInfiniteScroll({
    loading: loading || loadingMore,
    hasNextPage,
    onLoadMore: fetchNextPage,
    rootMargin: '0px 0px 100px 0px',
  });
  useEffect(() => {
    rootRef(scrollRoot);
  }, [rootRef, scrollRoot]);

  // Config resolved and not entitled → upsell (during first config load, fall
  // through to the skeleton below rather than flashing the upsell to paid users).
  if (projectConfig && !entitled) {
    return (
      <AuditLogUpsell isSelfHosted={!!globalConfig?.isSelfHostedMode} projectId={project?.id} />
    );
  }

  const columns: ResourceTableColumn<AuditLog>[] = [
    {
      header: t('settings.auditLog.columns.time'),
      headerClassName: 'w-52',
      className: 'whitespace-nowrap',
      cell: (log) => format(new Date(log.createdAt), 'PPpp'),
    },
    {
      header: t('settings.auditLog.columns.actor'),
      className: 'truncate',
      cell: (log) => actorLabel(log),
    },
    {
      header: t('settings.auditLog.columns.source'),
      headerClassName: 'w-20',
      cell: (log) => <Badge variant="secondary">{log.source.toUpperCase()}</Badge>,
    },
    {
      header: t('settings.auditLog.columns.action'),
      headerClassName: 'w-24',
      cell: (log) => log.action,
    },
    {
      header: t('settings.auditLog.columns.resource'),
      className: 'truncate',
      cell: (log) => (
        <span>
          <span className="text-muted-foreground">{log.resourceType}</span> {resourceLabel(log)}
        </span>
      ),
    },
    {
      header: t('settings.auditLog.columns.operation'),
      className: 'truncate',
      cell: (log) => log.operation,
    },
  ];

  return (
    <>
      <ResourceListPage<AuditLog>
        title={t('settings.auditLog.title')}
        description={t('settings.auditLog.description')}
        columns={columns}
        rows={auditLogs}
        loading={loading || (configLoading && !projectConfig)}
        empty={t('settings.auditLog.empty')}
        getRowKey={(log) => log.id}
        onRowClick={setSelected}
        footer={
          <div ref={sentryRef} className="flex h-10 items-center justify-center">
            {loadingMore && <SpinnerIcon className="h-5 w-5 animate-spin text-primary" />}
            {!hasNextPage && auditLogs.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('settings.auditLog.endOfLog')}
              </span>
            )}
          </div>
        }
      />
      <AuditDetailDialog log={selected} onClose={() => setSelected(null)} />
    </>
  );
};

AuditLogList.displayName = 'AuditLogList';
