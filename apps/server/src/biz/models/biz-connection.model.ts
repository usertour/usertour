import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType } from '@nestjs/graphql';
import { BizModel, BizUser } from './biz.model';

@ObjectType()
export class BizConnection extends PaginatedResponse(BizModel) {}

@ObjectType()
export class BizUserConnection extends PaginatedResponse(BizUser) {}
