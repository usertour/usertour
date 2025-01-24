import { Field, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import GraphQLJSON from "graphql-type-json";
import { JsonValue } from "@prisma/client/runtime/library";

@ObjectType()
export class VersionOnLocalization extends BaseModel {
  @Field(() => GraphQLJSON, { nullable: true })
  localized: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  backup: JsonValue;

  @Field(() => String)
  versionId: string;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => String)
  localizationId: string;
}
