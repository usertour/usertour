import type { OrderDirection } from '@/modules/common/constants/order-direction.constant';

import type { BizOrderField } from '../constants/biz-order-field.constant';

/** How a user / company list is ordered. */
export type BizOrdering = {
  field: BizOrderField;
  direction: OrderDirection;
};
