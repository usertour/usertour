import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { ContentDTO } from './content.dto';

@ObjectType('ContentConnection')
export class ContentConnectionDTO extends PaginatedResponse(ContentDTO, 'Content') {}
