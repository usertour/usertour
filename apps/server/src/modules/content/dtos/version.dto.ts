import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseDTO } from '@/modules/common/dtos/base.dto';

import { StepDTO } from './step.dto';

@ObjectType('Version')
export class VersionDTO extends BaseDTO {
  @Field(() => Number)
  sequence: number;

  /**
   * Stamped on first publish, never cleared, not copied to forks — non-null
   * means the version is FROZEN (the server's versionFrozen rule). Exposed so
   * view-side-effect guards can avoid writing onto a frozen version without
   * probing the server (a probe would fork — the very side effect they avoid).
   */
  @Field(() => Date, { nullable: true })
  publishedAt?: Date | null;

  /** Who created this version row (null for rows predating attribution). */
  @Field(() => String, { nullable: true })
  createdByUserId?: string | null;

  /** Who last wrote the version row. */
  @Field(() => String, { nullable: true })
  updatedByUserId?: string | null;

  /** Display name for updatedByUserId (resolved field). */
  @Field(() => String, { nullable: true })
  updatedByName?: string | null;

  @Field(() => String, { nullable: true })
  themeId?: string;

  @Field(() => String, { nullable: true })
  contentId: string;

  @Field(() => [StepDTO], { nullable: true })
  steps?: [StepDTO];

  @Field(() => GraphQLJSON, { nullable: true })
  config?: JsonObject;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  @Field(() => Date, { nullable: true })
  scheduledAt?: Date;
}
