import { BizUser } from '@/biz/models/biz.model';
import { BaseModel } from '@/common/models/base.model';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';
import { BizEvent } from './biz-event';
import { Content } from '@/contents/models/content.model';
import { Version } from '@/contents/models/version.model';

@ObjectType()
export class BizSession extends BaseModel {
  @Field(() => Int)
  state: number;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  @Field(() => Int)
  progress: number;

  @Field(() => String)
  bizUserId: string;

  @Field(() => String)
  contentId: string;

  @Field(() => BizUser)
  bizUser: BizUser;

  @Field(() => [BizEvent], { nullable: true })
  bizEvent?: BizEvent[];

  @Field(() => Content, { nullable: true })
  content?: Content;

  @Field(() => Version, { nullable: true })
  version?: Version;
}
