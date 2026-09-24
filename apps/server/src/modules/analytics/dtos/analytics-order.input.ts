import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '@/modules/common/dtos/order.input';

import { AnalyticsOrderField } from '../constants/analytics-order-field.constant';
import type { AnalyticsOrdering } from '../types/analytics-ordering.type';

registerEnumType(AnalyticsOrderField, {
  name: 'AnalyticsOrderField',
  description: 'Properties by which content connections can be ordered.',
});

@InputType()
export class AnalyticsOrder extends Order implements AnalyticsOrdering {
  @Field(() => AnalyticsOrderField)
  field: AnalyticsOrderField;
}
