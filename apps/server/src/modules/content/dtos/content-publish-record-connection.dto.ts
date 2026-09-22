import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { ContentPublishRecordDTO } from './content-publish-record.dto';

@ObjectType('ContentPublishRecordConnection')
export class ContentPublishRecordConnectionDTO extends PaginatedResponse(
  ContentPublishRecordDTO,
  'ContentPublishRecord',
) {}
