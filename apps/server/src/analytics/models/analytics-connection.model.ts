import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType } from '@nestjs/graphql';
import { BizSession } from './biz-session';
import { TrackerUser } from './tracker-user';

@ObjectType()
export class BizSessionConnection extends PaginatedResponse(BizSession) {}

@ObjectType()
export class TrackerUserConnection extends PaginatedResponse(TrackerUser) {}
