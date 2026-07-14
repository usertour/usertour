import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { Version } from './version.model';

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

  /**
   * The owning version, populated by upsertVersionLocalization: a
   * translation save touches the version's updatedAt, and returning the
   * version lets the client's normalized cache move "Autosaved" without a
   * refetch. List reads leave it null.
   */
  @Field(() => Version, { nullable: true })
  version?: Version;
}
