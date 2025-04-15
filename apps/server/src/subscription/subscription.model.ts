import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class SubscriptionPlanModel extends BaseModel {
  @Field(() => String)
  planType: string;

  @Field(() => String)
  interval: string;

  @Field(() => String)
  lookupKey: string;

  @Field(() => Number)
  mauQuota: number;

  @Field(() => Number)
  sessionCountQuota: number;
}

@ObjectType()
export class SubscriptionModel extends BaseModel {
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
