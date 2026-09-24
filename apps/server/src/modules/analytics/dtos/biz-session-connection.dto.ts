import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { BizSessionDTO } from './biz-session.dto';

@ObjectType('BizSessionConnection')
export class BizSessionConnectionDTO extends PaginatedResponse(BizSessionDTO, 'BizSession') {}
