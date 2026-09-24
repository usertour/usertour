import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { BizModelDTO } from './biz.dto';

@ObjectType('BizConnection')
export class BizConnectionDTO extends PaginatedResponse(BizModelDTO, 'BizModel') {}
