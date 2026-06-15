import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { Badge, Button, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { RiErrorWarningLine, SpinnerIcon } from '@usertour/icons';
import { type AuditLog, useGetProjectConfigQuery, useListAuditLogsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { useScrollRoot } from '@/contexts/scroll-root-context';
import { AuditDetailDialog } from './components/audit-detail-dialog';
import { AuditLogUpsell } from './components/audit-log-upsell';
import { actorLabel, resourceLabel } from './format';

/** Shown above the list on plans with a limited audit window (e.g. Growth = 7 days). */
const RetentionBanner = ({ days, projectId }: { days: number; projectId: string | undefined }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/5 bg-primary/10 px-4 py-3 text-sm">
      <RiErrorWarningLine className="h-4 w-4 shrink-0 text-primary" />
      <span>
        {t('settings.auditLog.retention.windowed', { days })}{' '}
        <Button
          variant="link"
          className="inline h-auto p-0 font-normal"
          onClick={() => navigate(`/project/${projectId}/settings/billing`)}
        >
          {t('settings.auditLog.retention.upgrade')}
        </Button>
      </span>
    </div>
  );
};

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
  // -1 = unlimited (Business+), >0 = a limited window (Growth = 7 days).
  const retentionDays = projectConfig?.auditLogRetentionDays ?? -1;

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
        toolbar={
          entitled && retentionDays > 0 ? (
            <RetentionBanner days={retentionDays} projectId={project?.id} />
          ) : undefined
        }
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
