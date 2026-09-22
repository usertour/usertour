import type { OrderDirection } from '@/modules/common/constants/order-direction.constant';

import type { AnalyticsOrderField } from '../constants/analytics-order-field.constant';

/** How an analytics list is ordered — what the paginated reads take. */
export type AnalyticsOrdering = {
  field: AnalyticsOrderField;
  direction: OrderDirection;
};
