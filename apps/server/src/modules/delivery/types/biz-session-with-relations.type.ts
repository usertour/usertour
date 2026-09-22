import type { BizSession, BizUser, Content } from '@prisma/client';

import type { BizEventWithEvent } from './biz-event-with-event.type';
import type { VersionWithSteps } from './version-with-steps.type';

export type BizSessionWithRelations = BizSession & {
  bizUser: BizUser;
  content: Content;
  version: VersionWithSteps;
  bizEvent: BizEventWithEvent[];
};
