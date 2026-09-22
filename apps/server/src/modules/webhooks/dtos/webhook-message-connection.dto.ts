import { ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

import { WebhookMessageDTO } from './webhook-message.dto';

@ObjectType('WebhookMessageConnection')
export class WebhookMessageConnectionDTO extends PaginatedResponse(
  WebhookMessageDTO,
  'WebhookMessage',
) {}
