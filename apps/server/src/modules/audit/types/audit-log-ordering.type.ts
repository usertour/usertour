import type { OrderDirection } from '@/modules/common/constants/order-direction.constant';

import type { AuditLogOrderField } from '../constants/audit-log-order-field.constant';

/** How the audit log is ordered — what AuditService.list takes. */
export type AuditLogOrdering = {
  field: AuditLogOrderField;
  direction: OrderDirection;
};
