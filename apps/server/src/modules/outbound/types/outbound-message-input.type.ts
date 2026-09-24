import type { Prisma } from '@prisma/client';

import type { OutboundDestination } from './outbound-destination.type';

export interface OutboundMessageInput {
  /** Public message id, chosen by the producer (webhook payload `id`). */
  id: string;
  environmentId: string;
  destination: OutboundDestination;
  topic: string;
  payload: Prisma.InputJsonValue;
}
