import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseModel } from '@/common/models/base.model';

import { BizModelDTO } from './biz.dto';

@ObjectType('BizUserOnCompanyModel')
export class BizUserOnCompanyDTO extends BaseModel {
  @Field(() => String)
  bizCompanyId: string;

  @Field(() => BizModelDTO, { nullable: true })
  bizCompany?: BizModelDTO;

  @Field(() => String)
  bizUserId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}
