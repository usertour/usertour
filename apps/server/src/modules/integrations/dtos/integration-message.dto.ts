import { Field, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

import { IntegrationDeliveryDTO } from './integration-delivery.dto';

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

  /** PENDING | DELIVERED | FAILED */
  @Field(() => String)
  status: string;

  @Field(() => GraphQLJSON)
  payload: unknown;

  @Field(() => [IntegrationDeliveryDTO])
  deliveries: IntegrationDeliveryDTO[];
}
