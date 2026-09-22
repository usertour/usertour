import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { BizSessionDTO } from './biz-session.dto';

@ObjectType('BizSessionConnection')
export class BizSessionConnectionDTO extends PaginatedResponse(BizSessionDTO, 'BizSession') {}
