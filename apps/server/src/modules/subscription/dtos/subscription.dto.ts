import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseDTO } from '@/modules/common/dtos/base.dto';

import { SubscriptionPlanType } from '../types/subscription-plan-type.type';

registerEnumType(SubscriptionPlanType, { name: 'SubscriptionPlanType' });

@ObjectType('SubscriptionModel')
export class SubscriptionDTO extends BaseDTO {
  @Field(() => String)
  projectId: string;

  @Field(() => String)
  subscriptionId: string;

  @Field(() => String)
  lookupKey: string;

  @Field(() => SubscriptionPlanType)
  planType: SubscriptionPlanType;

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
