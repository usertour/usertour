import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType } from '@nestjs/graphql';
import { BizSession } from './biz-session';

@ObjectType()
export class BizSessionConnection extends PaginatedResponse(BizSession) {}
