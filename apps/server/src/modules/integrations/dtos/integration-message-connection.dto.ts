import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { IntegrationMessageDTO } from './integration-message.dto';

@ObjectType('IntegrationMessageConnection')
export class IntegrationMessageConnectionDTO extends PaginatedResponse(
  IntegrationMessageDTO,
  'IntegrationMessage',
) {}
