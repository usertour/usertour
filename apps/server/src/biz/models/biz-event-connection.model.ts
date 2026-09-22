import PaginatedResponse from '@/common/pagination/pagination';
import { ObjectType } from '@nestjs/graphql';
import { BizEventDTO } from '@/modules/analytics/dtos/biz-event.dto';

@ObjectType()
export class BizEventConnection extends PaginatedResponse(BizEventDTO, 'BizEvent') {}
