import { useTranslation } from 'react-i18next';
import { Badge } from '@usertour/ui';

export interface OutboundMessageStatusBadgeProps {
  /** PENDING | DELIVERED | FAILED, as the ledger records it. */
  status: string;
}

/** DELIVERED → success, FAILED → destructive, PENDING → secondary. */
export const OutboundMessageStatusBadge = (props: OutboundMessageStatusBadgeProps) => {
  const { status } = props;
  const { t } = useTranslation();
  const variant =
    status === 'DELIVERED' ? 'success' : status === 'FAILED' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{t(`settings.outbound.status.${status}`)}</Badge>;
};

OutboundMessageStatusBadge.displayName = 'OutboundMessageStatusBadge';
