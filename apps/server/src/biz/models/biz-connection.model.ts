import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType } from '@nestjs/graphql';
import { BizModel } from './biz.model';

@ObjectType()
export class BizConnection extends PaginatedResponse(BizModel) {}
