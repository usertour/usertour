import { format } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, ResourceListPage, type ResourceTableColumn } from '@usertour/ui';
import { type AuditLog, useListAuditLogsQuery } from '@usertour/hooks';
import { SHARED_CACHE_QUERY_OPTIONS } from '@/apollo/options';
import { useAppContext } from '@/contexts/app-context';
import { AuditDetailDialog } from './components/audit-detail-dialog';

/**
 * Owner-only Activity / audit-log page: who changed/deleted what, when, and from
 * which surface (mcp vs api). Read-only; the list itself is never audited.
 */
export const AuditLogList = () => {
  const { project } = useAppContext();
  const { auditLogs, loading } = useListAuditLogsQuery(project?.id, SHARED_CACHE_QUERY_OPTIONS);
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const columns: ResourceTableColumn<AuditLog>[] = [
    {
      header: t('settings.auditLog.columns.time'),
      headerClassName: 'w-44',
      cell: (log) => format(new Date(log.createdAt), 'PPpp'),
    },
    {
      header: t('settings.auditLog.columns.actor'),
      className: 'truncate',
      cell: (log) => (
        <span className="font-mono text-xs">{log.actorUserId ?? log.actorTokenId ?? '—'}</span>
      ),
    },
    {
      header: t('settings.auditLog.columns.source'),
      headerClassName: 'w-20',
      cell: (log) => <Badge variant="secondary">{log.source}</Badge>,
    },
    {
      header: t('settings.auditLog.columns.action'),
      headerClassName: 'w-24',
      cell: (log) => log.action,
    },
    {
      header: t('settings.auditLog.columns.resource'),
      cell: (log) => (
        <span className="text-muted-foreground">
          {log.resourceType} <span className="font-mono text-xs">{log.resourceId}</span>
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
        loading={loading}
        empty={t('settings.auditLog.empty')}
        getRowKey={(log) => log.id}
        onRowClick={setSelected}
      />
      <AuditDetailDialog log={selected} onClose={() => setSelected(null)} />
    </>
  );
};

AuditLogList.displayName = 'AuditLogList';
