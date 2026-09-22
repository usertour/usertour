import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { BizUserDTO } from './biz-user.dto';

@ObjectType('BizUserConnection')
export class BizUserConnectionDTO extends PaginatedResponse(BizUserDTO, 'BizUser') {}
