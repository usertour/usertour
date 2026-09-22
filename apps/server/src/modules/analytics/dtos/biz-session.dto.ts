import { BizModelDTO } from '@/modules/biz/dtos/biz.dto';
import { BizUserDTO } from '@/modules/biz/dtos/biz-user.dto';
import { BaseModel } from '@/common/models/base.model';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';
import { BizEventDTO } from './biz-event.dto';
import { ContentDTO } from '@/modules/content/dtos/content.dto';
import { VersionDTO } from '@/modules/content/dtos/version.dto';

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

  @Field(() => BizUserDTO)
  bizUser: BizUserDTO;

  @Field(() => BizModelDTO, { nullable: true })
  bizCompany?: BizModelDTO;

  @Field(() => [BizEventDTO], { nullable: true })
  bizEvent?: BizEventDTO[];

  @Field(() => ContentDTO, { nullable: true })
  content?: ContentDTO;

  @Field(() => VersionDTO, { nullable: true })
  version?: VersionDTO;
}
