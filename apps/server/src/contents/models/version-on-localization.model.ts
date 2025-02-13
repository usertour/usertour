import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

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
