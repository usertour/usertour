import type { BizSession } from '@prisma/client';

import type { BizEventWithEvent } from './biz-event-with-event.type';

export type BizSessionWithEvents = BizSession & { bizEvent: BizEventWithEvent[] };
