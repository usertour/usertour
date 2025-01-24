import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Order } from '@/common/order/order';

export enum BizOrderField {
  id = 'id',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(BizOrderField, {
  name: 'BizOrderField',
  description: 'Properties by which content connections can be ordered.',
});

@InputType()
export class BizOrder extends Order {
  @Field(() => BizOrderField)
  field: BizOrderField;
}
