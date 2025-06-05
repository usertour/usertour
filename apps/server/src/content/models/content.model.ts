import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { Step } from './step.model';
import GraphQLJSON from 'graphql-type-json';
import { JsonValue } from '@prisma/client/runtime/library';
import { Environment } from '@/environments/models/environment.model';
import { Version } from './version.model';

export enum ContentType {
  CHECKLIST = 'checklist',
  FLOW = 'flow',
  LAUNCHER = 'launcher',
  BANNER = 'banner',
  NPS = 'nps',
  SURVEY = 'survey',
  TRACKER = 'tracker',
  EVENT = 'event',
}

@ObjectType()
export class ContentOnEnvironment extends BaseModel {
  @Field(() => Environment)
  environment: Environment;

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
  editedVersionId?: string;

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
