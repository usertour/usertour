import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '@/modules/common/dtos/order.input';

import { ContentOrderField } from '../constants/content-order-field.constant';

registerEnumType(ContentOrderField, {
  name: 'ContentOrderField',
  description: 'Properties by which content connections can be ordered.',
});

@InputType()
export class ContentOrder extends Order {
  @Field(() => ContentOrderField)
  field: ContentOrderField;
}
