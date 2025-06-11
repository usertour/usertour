import { Order } from '@/common/order/order';
import { Field, InputType, registerEnumType } from '@nestjs/graphql';

export enum ContentOrderField {
  id = 'id',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  publishedAt = 'publishedAt',
}

registerEnumType(ContentOrderField, {
  name: 'ContentOrderField',
  description: 'Properties by which content connections can be ordered.',
});

@InputType()
export class ContentOrder extends Order {
  @Field(() => ContentOrderField)
  field: ContentOrderField;
}
