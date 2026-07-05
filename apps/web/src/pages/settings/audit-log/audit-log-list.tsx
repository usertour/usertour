import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import {
  Badge,
  ResourceListPage,
  type ResourceTableColumn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { RiSparklingFill, SpinnerIcon } from '@usertour/icons';
import {
  type AuditLog,
  type AuditLogFilter,
  useGetProjectConfigQuery,
  useListAuditLogsQuery,
} from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { useScrollRoot } from '@/contexts/scroll-root-context';
import { AuditDetailDialog } from './components/audit-detail-dialog';
import { AuditLogFilters, type AuditFiltersValue } from './components/audit-log-filters';
import { AuditLogUpsell } from './components/audit-log-upsell';
import { actorLabel, resourceLabel } from './format';

/**
 * Premium marker next to the title on plans with a limited audit window (Growth =
 * 7 days). Reuses the app's "enterprise feature" sparkle + tooltip (see the 2FA
 * settings) — informative, not naggy. Business+ (unlimited) shows nothing.
 */
const RetentionMarker = ({ days }: { days: number }) => {
  const { t } = useTranslation();
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger className="inline-flex cursor-default">
          <RiSparklingFill className="h-5 w-5 text-indigo-500" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {t('settings.auditLog.retention.tooltip', { days })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

  const [filters, setFilters] = useState<AuditFiltersValue>({});
  const auditFilter: AuditLogFilter = useMemo(
    () => ({
      source: filters.source,
      action: filters.action,
      resourceType: filters.resourceType,
      environmentId: filters.environmentId,
      actorUserId: filters.actorUserId,
      createdAtFrom: filters.dateRange?.from
        ? startOfDay(filters.dateRange.from).toISOString()
        : undefined,
      createdAtTo: filters.dateRange?.to ? endOfDay(filters.dateRange.to).toISOString() : undefined,
    }),
    [filters],
  );

  const { auditLogs, loading, loadingMore, hasNextPage, fetchNextPage } = useListAuditLogsQuery(
    project?.id,
    auditFilter,
    { ...SHARED_CACHE_QUERY_OPTIONS, skip: !entitled },
  );
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const isSelfHosted = !!globalConfig?.isSelfHostedMode;

  // The selected range starts on a day that is ENTIRELY outside the plan's read
  // window (boundary days that are only partially clipped don't warn) — the
  // server silently clamps, so without this the missing rows read as data loss.
  const rangeBeyondWindow =
    retentionDays > 0 &&
    !!filters.dateRange?.from &&
    endOfDay(filters.dateRange.from) < subDays(new Date(), retentionDays);

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
        title={
          entitled && retentionDays > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              {t('settings.auditLog.title')}
              <RetentionMarker days={retentionDays} />
            </span>
          ) : (
            t('settings.auditLog.title')
          )
        }
        description={t('settings.auditLog.description')}
        toolbar={
          <div className="flex flex-col gap-2">
            <AuditLogFilters value={filters} setValue={setFilters} />
            {rangeBeyondWindow && (
              <p className="text-xs text-muted-foreground">
                {t('settings.auditLog.retention.rangeBeyondWindow', { days: retentionDays })}
                {!isSelfHosted && (
                  <>
                    {' '}
                    <UpgradeLink projectId={project?.id} />
                  </>
                )}
              </p>
            )}
          </div>
        }
        columns={columns}
        rows={auditLogs}
        loading={loading || (configLoading && !projectConfig)}
        empty={t('settings.auditLog.empty')}
        getRowKey={(log) => log.id}
        onRowClick={setSelected}
        footer={
          <div ref={sentryRef} className="flex h-10 items-center justify-center">
            {loadingMore && <SpinnerIcon className="h-5 w-5 animate-spin text-primary" />}
            {!hasNextPage &&
              auditLogs.length > 0 &&
              (retentionDays > 0 ? (
                // Not the end of the log — the end of the plan's read window.
                <span className="text-xs text-muted-foreground">
                  {t('settings.auditLog.retention.endOfWindow', { days: retentionDays })}
                  {!isSelfHosted && (
                    <>
                      {' '}
                      <UpgradeLink projectId={project?.id} />
                    </>
                  )}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('settings.auditLog.endOfLog')}
                </span>
              ))}
          </div>
        }
      />
      <AuditDetailDialog log={selected} onClose={() => setSelected(null)} />
    </>
  );
};

/**
 * Inline "upgrade for full history" link, cloud only — self-hosted has no
 * billing page (the license upsell copy lives on the locked view instead).
 */
const UpgradeLink = ({ projectId }: { projectId: string | undefined }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="text-primary hover:underline"
      onClick={() => navigate(`/project/${projectId}/settings/billing`)}
    >
      {t('settings.auditLog.retention.upgrade')}
    </button>
  );
};

AuditLogList.displayName = 'AuditLogList';
