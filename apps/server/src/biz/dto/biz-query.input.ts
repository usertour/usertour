import { Field, InputType } from "@nestjs/graphql";
import { JsonObject, JsonValue } from "@prisma/client/runtime/library";
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class BizQuery {

  @Field(() => String, { nullable: true })
  environmentId: string;

  @Field(() => String, { nullable: true })
  segmentId?: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  companyId?: string;

  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}
