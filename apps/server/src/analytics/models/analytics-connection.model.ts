import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType, Field } from '@nestjs/graphql';
import { BizSession } from './biz-session';
import { BizEvent } from './biz-event';
import { BizModel } from '@/biz/models/biz.model';

@ObjectType()
export class BizSessionConnection extends PaginatedResponse(BizSession) {}

@ObjectType()
export class BizSessionDetail extends BizSession {
  @Field(() => [BizEvent])
  bizEvents: BizEvent[];

  @Field(() => BizModel)
  bizUser: BizModel;
}
