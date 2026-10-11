import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OutboundMessageStatus } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

import { IntegrationDeliveryDTO } from './integration-delivery.dto';

registerEnumType(OutboundMessageStatus, { name: 'OutboundMessageStatus' });

/**
 * GraphQL projection of an outbound message addressed to an integration, with
 * its attempts. `payload` is the canonical envelope (the provider wire format
 * is derived from it at delivery time).
 */
@ObjectType('IntegrationMessage')
export class IntegrationMessageDTO {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String)
  topic: string;

  @Field(() => OutboundMessageStatus)
  status: OutboundMessageStatus;

  @Field(() => GraphQLJSON)
  payload: unknown;

  @Field(() => [IntegrationDeliveryDTO])
  deliveries: IntegrationDeliveryDTO[];
}
