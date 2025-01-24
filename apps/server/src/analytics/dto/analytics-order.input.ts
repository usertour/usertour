import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Order } from '@/common/order/order';

export enum AnalyticsOrderField {
  id = 'id',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(AnalyticsOrderField, {
  name: 'AnalyticsOrderField',
  description: 'Properties by which content connections can be ordered.',
});

@InputType()
export class AnalyticsOrder extends Order {
  @Field(() => AnalyticsOrderField)
  field: AnalyticsOrderField;
}
