import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { ContentDTO } from './content.dto';

@ObjectType('ContentConnection')
export class ContentConnectionDTO extends PaginatedResponse(ContentDTO, 'Content') {}
