import type { OrderDirection } from '@/common/order/order-direction';

import type { BizOrderField } from '../constants/biz-order-field.constant';

/** How a user / company list is ordered. */
export type BizOrdering = {
  field: BizOrderField;
  direction: OrderDirection;
};
