import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { IntegrationMessageDTO } from './integration-message.dto';

@ObjectType('IntegrationMessageConnection')
export class IntegrationMessageConnectionDTO extends PaginatedResponse(
  IntegrationMessageDTO,
  'IntegrationMessage',
) {}
