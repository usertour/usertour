import { useTranslation } from 'react-i18next';
import type { WebhookMessageStatus } from '@usertour/hooks';
import { Badge } from '@usertour/ui';

export interface WebhookMessageStatusBadgeProps {
  status: WebhookMessageStatus;
}

/** DELIVERED → success, FAILED → destructive, PENDING → secondary. */
export const WebhookMessageStatusBadge = (props: WebhookMessageStatusBadgeProps) => {
  const { status } = props;
  const { t } = useTranslation();
  const variant =
    status === 'DELIVERED' ? 'success' : status === 'FAILED' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{t(`settings.webhooks.message.status.${status}`)}</Badge>;
};

WebhookMessageStatusBadge.displayName = 'WebhookMessageStatusBadge';
