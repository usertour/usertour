import { BaseModel } from '@/common/models/base.model';
import { BizModel } from '@/biz/models/biz.model';
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

  @Field(() => BizModel, { nullable: true })
  bizCompany?: BizModel;

  @Field(() => BizModel, { nullable: true })
  bizUser?: BizModel;

  @Field(() => EventsDTO, { nullable: true })
  event?: EventsDTO;
}
