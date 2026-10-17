import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OutboundMessageStatus } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

import { WebhookDeliveryDTO } from './webhook-delivery.dto';

registerEnumType(OutboundMessageStatus, { name: 'OutboundMessageStatus' });

/**
 * GraphQL projection of an outbound message addressed to a webhook, with its
 * attempts. `id` is the public message id (payload `id`, receiver idempotency
 * key); `payload` is the body exactly as sent.
 */
@ObjectType('WebhookMessage')
export class WebhookMessageDTO {
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

  @Field(() => [WebhookDeliveryDTO])
  deliveries: WebhookDeliveryDTO[];
}
