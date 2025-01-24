import { Field, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import GraphQLJSON from "graphql-type-json";
import { JsonValue } from "@prisma/client/runtime/library";

@ObjectType()
export class Theme extends BaseModel {
  @Field()
  name: string;

  @Field(() => Boolean)
  isDefault: boolean;

  @Field(() => Boolean)
  isSystem: boolean;

  @Field(() => String)
  projectId: string;

  @Field(() => GraphQLJSON)
  settings: JsonValue;
}
