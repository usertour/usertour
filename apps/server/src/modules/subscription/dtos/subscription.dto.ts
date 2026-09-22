import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseDTO } from '@/modules/common/dtos/base.dto';

@ObjectType('SubscriptionModel')
export class SubscriptionDTO extends BaseDTO {
  @Field(() => String)
  projectId: string;

  @Field(() => String)
  subscriptionId: string;

  @Field(() => String)
  lookupKey: string;

  @Field(() => String)
  planType: string;

  @Field(() => String)
  interval: string;

  @Field(() => String)
  status: string;

  @Field(() => Boolean)
  isTrial: boolean;

  @Field(() => String, { nullable: true })
  cancelAt: Date | null;

  @Field(() => GraphQLJSON, { nullable: true })
  overridePlan?: JsonValue;
}
