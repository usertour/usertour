import { ObjectType } from '@nestjs/graphql';

import { PaginatedResponse } from '@/modules/common/dtos/paginated-response.dto';

import { WebhookMessageDTO } from './webhook-message.dto';

@ObjectType('WebhookMessageConnection')
export class WebhookMessageConnectionDTO extends PaginatedResponse(
  WebhookMessageDTO,
  'WebhookMessage',
) {}
