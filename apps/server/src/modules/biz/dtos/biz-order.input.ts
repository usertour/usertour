import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '@/common/order/order';

import { BizOrderField } from '../constants/biz-order-field.constant';
import type { BizOrdering } from '../types/biz-ordering.type';

registerEnumType(BizOrderField, {
  name: 'BizOrderField',
  description: 'Properties by which content connections can be ordered.',
});

@InputType()
export class BizOrder extends Order implements BizOrdering {
  @Field(() => BizOrderField)
  field: BizOrderField;
}
