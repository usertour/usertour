import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType } from '@nestjs/graphql';
import { BizEvent } from '@/analytics/models/biz-event';

@ObjectType()
export class BizEventConnection extends PaginatedResponse(BizEvent) {}
