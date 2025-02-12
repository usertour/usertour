import { BizModel } from '@/biz/models/biz.model';
import { BaseModel } from '@/common/models/base.model';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';
import { BizEvent } from './biz-event';

@ObjectType()
export class BizSession extends BaseModel {
  @Field(() => Int)
  state: number;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  @Field(() => Int)
  progress: number;

  @Field(() => String)
  bizUserId: string;

  @Field(() => String)
  contentId: string;

  @Field(() => BizModel)
  bizUser: BizModel;

  @Field(() => [BizEvent], { nullable: true })
  bizEvent: BizEvent[];
}
