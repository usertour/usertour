import type { BizEvent, Event } from '@prisma/client';

export type BizEventWithEvent = BizEvent & { event: Event };
