import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { WebhookMessage } from '@usertour/hooks';
import { RiFileCopyLine, SpinnerIcon } from '@usertour/icons';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour/ui';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';
import { WebhookMessageStatusBadge } from './webhook-message-status-badge';

export interface WebhookMessageDialogProps {
  open: boolean;
  /**
   * The message to show. Keep it set while `open` is false so the content
   * stays mounted through the close animation — clearing it on close would
   * collapse the dialog to its header mid-fade.
   */
  message: WebhookMessage | null;
  onClose: () => void;
  onResend: (message: WebhookMessage) => void;
  resending: boolean;
  /** Resend needs an enabled endpoint and manage rights; disabled otherwise. */
  canResend: boolean;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="min-w-0 text-sm">{children}</span>
  </div>
);

/**
 * Row-detail dialog for one logged message: what was sent (payload as sent,
 * copyable) and every attempt with status / duration / response excerpt /
 * error. Resend re-queues the same payload under the same message id.
 */
export const WebhookMessageDialog = (props: WebhookMessageDialogProps) => {
  const { open, message, onClose, onResend, resending, canResend } = props;
  const { t } = useTranslation();
  const copy = useCopyWithToast();
  const payloadText = message ? JSON.stringify(message.payload, null, 2) : '';

  return (
    <Dialog
      open={open && !!message}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      {/* Bounded to the viewport; the body scrolls as one region with the
          title pinned — payload and attempts can both grow. */}
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('settings.webhooks.message.title')}
            {message && <WebhookMessageStatusBadge status={message.status} />}
          </DialogTitle>
        </DialogHeader>
        {message && (
          <div className="flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto">
            <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3">
              <Field label={t('settings.webhooks.message.id')}>
                <span className="break-all font-mono text-xs">{message.id}</span>
              </Field>
              <Field label={t('settings.webhooks.deliveries.columns.topic')}>
                <span className="break-all font-mono text-xs">{message.topic}</span>
              </Field>
              <Field label={t('settings.webhooks.message.createdAt')}>
                {format(new Date(message.createdAt), 'PP pp')}
              </Field>
              <Field label={t('settings.webhooks.message.attempts')}>
                {message.deliveries.length}
              </Field>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t('settings.webhooks.message.payload')}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => copy(payloadText, t('settings.webhooks.message.payloadCopied'))}
                >
                  <RiFileCopyLine className="h-3.5 w-3.5" />
                  {t('settings.webhooks.message.copyPayload')}
                </Button>
              </div>
              <pre className="max-w-full whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-xs">
                {payloadText}
              </pre>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">{t('settings.webhooks.message.attempts')}</span>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-44">
                      {t('settings.webhooks.deliveries.columns.time')}
                    </TableHead>
                    <TableHead className="w-24">
                      {t('settings.webhooks.deliveries.columns.status')}
                    </TableHead>
                    <TableHead className="w-24">
                      {t('settings.webhooks.deliveries.columns.duration')}
                    </TableHead>
                    <TableHead>{t('settings.webhooks.message.response')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {message.deliveries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                        {t('settings.webhooks.message.noAttempts')}
                      </TableCell>
                    </TableRow>
                  )}
                  {message.deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>{delivery.attempt}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(delivery.createdAt), 'PP pp')}
                      </TableCell>
                      <TableCell>
                        {delivery.success ? (
                          <Badge variant="success">
                            {delivery.responseStatus ?? t('settings.webhooks.responseOk')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {delivery.responseStatus ?? t('settings.webhooks.responseError')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {delivery.durationMs != null ? `${delivery.durationMs}ms` : '—'}
                      </TableCell>
                      <TableCell className="min-w-0">
                        {delivery.error && (
                          <div className="break-all text-xs text-destructive">{delivery.error}</div>
                        )}
                        {delivery.responseBody && (
                          <pre className="mt-1 whitespace-pre-wrap break-all rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                            {delivery.responseBody}
                          </pre>
                        )}
                        {!delivery.error && !delivery.responseBody && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {message && (
          // Pinned below the scroll region so the action never scrolls away
          // behind a long payload.
          <div className="flex shrink-0 items-center justify-between gap-4 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {t('settings.webhooks.message.resendHint')}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={!canResend || resending || message.status === 'PENDING'}
              onClick={() => onResend(message)}
            >
              {resending && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              {t('settings.webhooks.message.resend')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

WebhookMessageDialog.displayName = 'WebhookMessageDialog';
