import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseModel } from '@/common/models/base.model';

import { ContentOnEnvironmentDTO } from './content-on-environment.dto';
import { StepDTO } from './step.dto';
import { VersionDTO } from './version.dto';

@ObjectType('Content')
export class ContentDTO extends BaseModel {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  buildUrl?: string;

  @Field(() => String, { nullable: true })
  type: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config?: JsonValue;

  @Field(() => String)
  environmentId: string;

  @Field(() => String, { nullable: true })
  projectId?: string;

  @Field(() => String, { nullable: true })
  editedVersionId?: string;

  @Field(() => VersionDTO, { nullable: true })
  editedVersion?: VersionDTO;

  @Field(() => Date)
  publishedAt: Date;

  @Field(() => String, { nullable: true })
  publishedVersionId?: string;

  @Field(() => VersionDTO, { nullable: true })
  publishedVersion?: VersionDTO;

  @Field(() => Boolean)
  published: boolean;

  @Field(() => Boolean)
  deleted: boolean;

  @Field(() => [StepDTO], { nullable: true })
  steps?: [StepDTO];

  @Field(() => [ContentOnEnvironmentDTO], { nullable: true })
  contentOnEnvironments?: [ContentOnEnvironmentDTO];
}
