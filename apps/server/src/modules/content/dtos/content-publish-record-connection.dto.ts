import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { ContentPublishRecordDTO } from './content-publish-record.dto';

@ObjectType('ContentPublishRecordConnection')
export class ContentPublishRecordConnectionDTO extends PaginatedResponse(
  ContentPublishRecordDTO,
  'ContentPublishRecord',
) {}
