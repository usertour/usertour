import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { type IntegrationSyncRun, useListIntegrationSyncRunsQuery } from '@usertour/hooks';
import { RiRefreshLine } from '@usertour/icons';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';

const RUNNING_POLL_INTERVAL_MS = 5000;

export interface CrmSyncActivitySectionProps {
  integrationId: string;
  providerName: string;
}

/**
 * What the sync did lately, and whether anything failed: one row per full
 * round and per journal poll that changed something. The pull side of the
 * integration, which the message log (deliveries only) cannot show.
 */
export const CrmSyncActivitySection = (props: CrmSyncActivitySectionProps) => {
  const { integrationId, providerName } = props;
  const { t } = useTranslation();
  const { runs, loading, refetch, startPolling, stopPolling } = useListIntegrationSyncRunsQuery(
    integrationId,
    SHARED_CACHE_QUERY_OPTIONS,
  );
  const anyRunning = (runs ?? []).some((run) => run.status === 'running');
  // A live round updates its counts page by page; follow it until it closes.
  useEffect(() => {
    if (!anyRunning) {
      return;
    }
    startPolling(RUNNING_POLL_INTERVAL_MS);
    return () => stopPolling();
  }, [anyRunning, startPolling, stopPolling]);

  const pairLabel = (run: IntegrationSyncRun) => {
    if (!run.remoteObject || !run.localObject) {
      return '';
    }
    return `${t(`settings.integrations.crm.mapping.remoteObjects.${run.remoteObject}`)} ↔ ${t(
      `settings.integrations.crm.mapping.localObjects.${run.localObject}`,
    )}`;
  };
  const kindLabel = (run: IntegrationSyncRun) =>
    run.kind === 'full'
      ? t('settings.integrations.crm.activity.kindFull')
      : t('settings.integrations.crm.activity.kindJournal', { name: providerName });
  const recordsLabel = (run: IntegrationSyncRun) =>
    run.kind === 'full'
      ? t('settings.integrations.crm.activity.fullRecords', {
          records: run.records,
          matched: run.matchedCount,
          unresolved: run.unresolvedCount,
        })
      : t('settings.integrations.crm.activity.journalRecords', { count: run.records });

  const statusBadge = (run: IntegrationSyncRun) => {
    if (run.status === 'running') {
      return (
        <Badge variant="secondary">{t('settings.integrations.crm.activity.statusRunning')}</Badge>
      );
    }
    if (run.status === 'failed') {
      const badge = (
        <Badge variant="destructive" className={cn(run.error && 'cursor-help')}>
          {t('settings.integrations.crm.activity.statusFailed')}
        </Badge>
      );
      if (!run.error) {
        return badge;
      }
      return (
        <Tooltip>
          <TooltipTrigger type="button">{badge}</TooltipTrigger>
          <TooltipContent className="max-w-sm break-words">{run.error}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Badge variant="success">{t('settings.integrations.crm.activity.statusSucceeded')}</Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex h-10 flex-row items-center justify-between gap-4">
          <h3 className="text-xl font-medium tracking-tight">
            {t('settings.integrations.crm.activity.title')}
          </h3>
          <Button
            variant="outline"
            size="icon"
            disabled={loading}
            title={t('settings.integrations.messages.refresh')}
            aria-label={t('settings.integrations.messages.refresh')}
            onClick={() => void refetch()}
          >
            <RiRefreshLine className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">
          {t('settings.integrations.crm.activity.description', { name: providerName })}
        </p>
        {runs && runs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('settings.integrations.crm.activity.empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">
                  {t('settings.integrations.crm.activity.columns.time')}
                </TableHead>
                <TableHead>{t('settings.integrations.crm.activity.columns.sync')}</TableHead>
                <TableHead className="w-28">
                  {t('settings.integrations.crm.activity.columns.result')}
                </TableHead>
                <TableHead>{t('settings.integrations.crm.activity.columns.records')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runs ?? []).map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(new Date(run.startedAt), 'PPp')}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{kindLabel(run)}</span>
                    {pairLabel(run) && (
                      <span className="ml-2 text-muted-foreground">{pairLabel(run)}</span>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(run)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {run.remoteIds && run.remoteIds.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger type="button" className="cursor-help">
                          {recordsLabel(run)}
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm break-words">
                          {t('settings.integrations.crm.activity.remoteIds', {
                            name: providerName,
                            ids: run.remoteIds.join(', '),
                          })}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      recordsLabel(run)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </TooltipProvider>
  );
};

CrmSyncActivitySection.displayName = 'CrmSyncActivitySection';
