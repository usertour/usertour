import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { BizModelDTO } from './biz.dto';

@ObjectType('BizConnection')
export class BizConnectionDTO extends PaginatedResponse(BizModelDTO, 'BizModel') {}
