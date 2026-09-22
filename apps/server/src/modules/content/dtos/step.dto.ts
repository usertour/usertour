import { Field, ObjectType } from '@nestjs/graphql';
import { JsonArray, JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseModel } from '@/common/models/base.model';

@ObjectType('Step')
export class StepDTO extends BaseModel {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  versionId: string;

  @Field(() => String)
  cvid: string;

  @Field(() => String, { nullable: true })
  themeId?: string;

  @Field(() => Number, { nullable: true })
  sequence?: number;

  @Field(() => String, { nullable: true })
  contentId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  target?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  trigger?: JsonArray;

  @Field(() => GraphQLJSON, { nullable: true })
  screenshot?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  setting?: JsonValue;
}
