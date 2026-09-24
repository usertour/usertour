import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { OrderDirection } from '../constants/order-direction.constant';

registerEnumType(OrderDirection, {
  name: 'OrderDirection',
  description:
    'Possible directions in which to order a list of items when provided an `orderBy` argument.',
});

@InputType({ isAbstract: true })
export abstract class Order {
  @Field(() => OrderDirection)
  direction: OrderDirection;
}
