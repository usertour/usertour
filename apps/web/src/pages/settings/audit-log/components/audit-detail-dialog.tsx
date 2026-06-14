import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@usertour/ui';
import type { AuditLog } from '@usertour/hooks';

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
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
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
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label={t('settings.auditLog.columns.action')}>{log.action}</Field>
              <Field label={t('settings.auditLog.columns.source')}>
                <Badge variant="secondary">{log.source}</Badge>
              </Field>
              <Field label={t('settings.auditLog.columns.resource')}>
                {log.resourceType}{' '}
                <span className="font-mono text-xs text-muted-foreground">{log.resourceId}</span>
              </Field>
              <Field label={t('settings.auditLog.columns.actor')}>
                <span className="font-mono text-xs">
                  {log.actorUserId ?? log.actorTokenId ?? '—'}
                </span>
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
