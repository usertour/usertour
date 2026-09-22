import type { OrderDirection } from '@/common/order/order-direction';

import type { AuditLogOrderField } from '../constants/audit-log-order-field.constant';

/** How the audit log is ordered — what AuditService.list takes. */
export type AuditLogOrdering = {
  field: AuditLogOrderField;
  direction: OrderDirection;
};
