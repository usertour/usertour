import { BaseModel } from '@/common/models/base.model';
import { BizModelDTO } from '@/modules/biz/dtos/biz.dto';
import { EventsDTO } from '@/modules/events/dtos/events.dto';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType('BizEvent')
export class BizEventDTO extends BaseModel {
  @Field(() => String)
  eventId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  @Field(() => String)
  bizUserId: string;

  @Field(() => String, { nullable: true })
  bizSessionId?: string;

  @Field(() => String, { nullable: true })
  bizCompanyId?: string;

  @Field(() => BizModelDTO, { nullable: true })
  bizCompany?: BizModelDTO;

  @Field(() => BizModelDTO, { nullable: true })
  bizUser?: BizModelDTO;

  @Field(() => EventsDTO, { nullable: true })
  event?: EventsDTO;
}
