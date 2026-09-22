import { BizModel, BizUser } from '@/biz/models/biz.model';
import { BaseModel } from '@/common/models/base.model';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';
import { BizEventDTO } from './biz-event.dto';
import { Content } from '@/content/models/content.model';
import { Version } from '@/content/models/version.model';

@ObjectType('BizSession')
export class BizSessionDTO extends BaseModel {
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

  @Field(() => BizModel, { nullable: true })
  bizCompany?: BizModel;

  @Field(() => [BizEventDTO], { nullable: true })
  bizEvent?: BizEventDTO[];

  @Field(() => Content, { nullable: true })
  content?: Content;

  @Field(() => Version, { nullable: true })
  version?: Version;
}
