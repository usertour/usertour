import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseDTO } from '@/modules/common/dtos/base.dto';

import { BizModelDTO } from './biz.dto';

@ObjectType('BizUserOnCompanyModel')
export class BizUserOnCompanyDTO extends BaseDTO {
  @Field(() => String)
  bizCompanyId: string;

  @Field(() => BizModelDTO, { nullable: true })
  bizCompany?: BizModelDTO;

  @Field(() => String)
  bizUserId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}
