import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { Step } from './step.model';
import GraphQLJSON from 'graphql-type-json';
import { JsonValue } from '@prisma/client/runtime/library';
import { EnvironmentDTO } from '@/modules/environments/dtos/environment.dto';
import { Version } from './version.model';

@ObjectType()
export class ContentOnEnvironment extends BaseModel {
  @Field(() => EnvironmentDTO)
  environment: EnvironmentDTO;

  @Field(() => String)
  environmentId: string;

  @Field(() => String)
  contentId: string;

  @Field(() => Boolean)
  published: boolean;

  @Field(() => Date)
  publishedAt: Date;

  @Field(() => String)
  publishedVersionId: string;

  @Field(() => Version)
  publishedVersion: Version;
}

@ObjectType()
export class Content extends BaseModel {
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

  @Field(() => Version, { nullable: true })
  editedVersion?: Version;

  @Field(() => Date)
  publishedAt: Date;

  @Field(() => String, { nullable: true })
  publishedVersionId?: string;

  @Field(() => Version, { nullable: true })
  publishedVersion?: Version;

  @Field(() => Boolean)
  published: boolean;

  @Field(() => Boolean)
  deleted: boolean;

  @Field(() => [Step], { nullable: true })
  steps?: [Step];

  @Field(() => [ContentOnEnvironment], { nullable: true })
  contentOnEnvironments?: [ContentOnEnvironment];
}
