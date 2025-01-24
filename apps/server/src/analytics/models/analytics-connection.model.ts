import { ObjectType } from '@nestjs/graphql';
import PaginatedResponse from '@/common/pagination/pagination';
import { BizSession } from './biz-session';

@ObjectType()
export class BizSessionConnection extends PaginatedResponse(BizSession) { }
