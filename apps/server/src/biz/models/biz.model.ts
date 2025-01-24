import { Field, Int, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import GraphQLJSON from 'graphql-type-json';
import { JsonObject, JsonValue } from "@prisma/client/runtime/library";


@ObjectType()
export class BizModel extends BaseModel {
  @Field(() => String)
  environmentId: string;

  @Field(() => String)
  externalId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  @Field(() => GraphQLJSON)
  membership?: JsonObject;
}
