import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { BizUserDTO } from './biz-user.dto';

@ObjectType('BizUserConnection')
export class BizUserConnectionDTO extends PaginatedResponse(BizUserDTO, 'BizUser') {}
