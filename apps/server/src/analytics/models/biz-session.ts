import { Field, Int, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import GraphQLJSON from 'graphql-type-json';
import { JsonObject } from "@prisma/client/runtime/library";
import { BizModel } from "@/biz/models/biz.model";
import { BizEvent } from "./biz-event";

@ObjectType()
export class BizSession extends BaseModel {
  @Field(() => Int)
  state: Number;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  @Field(() => Int)
  progress: Number;

  @Field(() => String)
  bizUserId: string;

  @Field(() => String)
  contentId: string;

  @Field(() => BizModel)
  bizUser: BizModel;

  @Field(() => [BizEvent], { nullable: true })
  bizEvent: BizEvent[];

}
