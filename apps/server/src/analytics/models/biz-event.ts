import { BaseModel } from '@/common/models/base.model';
import { Events } from '@/events/models/events.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class BizEvent extends BaseModel {
  @Field(() => String)
  eventId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  @Field(() => String)
  bizUserId: string;

  @Field(() => String)
  bizSessionId: string;

  @Field(() => Events, { nullable: true })
  event?: Events;
}
