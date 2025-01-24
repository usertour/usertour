import { ObjectType } from '@nestjs/graphql';
import PaginatedResponse from '@/common/pagination/pagination';
import { BizModel } from './biz.model';

@ObjectType()
export class BizConnection extends PaginatedResponse(BizModel) { }
