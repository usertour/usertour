import { Field, Int, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import GraphQLJSON from 'graphql-type-json';
import { JsonObject } from "@prisma/client/runtime/library";

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

}
