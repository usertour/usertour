import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { Step } from './step.model';
import GraphQLJSON from 'graphql-type-json';
import { JsonValue } from '@prisma/client/runtime/library';

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

  @Field(() => Boolean)
  published: boolean;

  @Field(() => Boolean)
  deleted: boolean;

  @Field(() => [Step], { nullable: true })
  steps?: [Step];
}
