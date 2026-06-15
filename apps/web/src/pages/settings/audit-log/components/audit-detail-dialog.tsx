import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@usertour/ui';
import type { AuditLog } from '@usertour/hooks';
import { actorLabel } from '../format';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm">{children}</span>
  </div>
);

const JsonBlock = ({ label, value }: { label: string; value: unknown }) => {
  if (value === null || value === undefined) {
    return null;
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <pre className="max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
};

/** Row-detail dialog: the audit entry's metadata + before/after snapshots. */
export const AuditDetailDialog = ({
  log,
  onClose,
}: {
  log: AuditLog | null;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={!!log}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('settings.auditLog.detail.title')}</DialogTitle>
        </DialogHeader>
        {log && (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3">
              <Field label={t('settings.auditLog.columns.action')}>{log.action}</Field>
              <Field label={t('settings.auditLog.columns.source')}>
                <Badge variant="secondary">{log.source.toUpperCase()}</Badge>
              </Field>
              <Field label={t('settings.auditLog.columns.resource')}>
                <div className="flex flex-col">
                  <span>
                    {log.resourceType}
                    {log.resourceName ? ` · ${log.resourceName}` : ''}
                  </span>
                  <span className="break-all font-mono text-xs text-muted-foreground">
                    {log.resourceId}
                  </span>
                </div>
              </Field>
              <Field label={t('settings.auditLog.columns.actor')}>
                <div className="flex flex-col">
                  <span>{actorLabel(log)}</span>
                  {log.actorUserName && log.actorTokenName && (
                    <span className="text-xs text-muted-foreground">
                      {t('settings.auditLog.detail.via')} {log.actorTokenName}
                    </span>
                  )}
                  <span className="break-all font-mono text-xs text-muted-foreground">
                    {[log.actorUserId, log.actorTokenId].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
              </Field>
              <Field label={t('settings.auditLog.columns.operation')}>{log.operation}</Field>
              <Field label={t('settings.auditLog.columns.time')}>
                {format(new Date(log.createdAt), 'PPpp')}
              </Field>
            </div>
            <JsonBlock label={t('settings.auditLog.detail.before')} value={log.before} />
            <JsonBlock label={t('settings.auditLog.detail.after')} value={log.after} />
            <JsonBlock label={t('settings.auditLog.detail.metadata')} value={log.metadata} />
            {log.before == null && log.after == null && (
              <span className="text-sm text-muted-foreground">
                {t('settings.auditLog.detail.noSnapshot')}
              </span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

AuditDetailDialog.displayName = 'AuditDetailDialog';
