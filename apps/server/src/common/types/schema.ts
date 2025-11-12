import { Prisma } from '@prisma/client';
import {
  Event,
  BizEvent,
  BizSession,
  BizCompany,
  BizUser,
  Step,
  Version,
  Theme,
  Content,
  Environment,
  AttributeOnEvent,
  Attribute,
  BizAnswer,
  ContentOnEnvironment,
} from '@prisma/client';

// Re-export Prisma types for convenience
export {
  Event,
  BizEvent,
  BizSession,
  BizCompany,
  BizUser,
  Step,
  Version,
  Theme,
  Content,
  Environment,
  AttributeOnEvent,
  Attribute,
  BizAnswer,
  ContentOnEnvironment,
};

export type BizEventWithEvent = BizEvent & { event: Event };
export type BizSessionWithEvents = BizSession & { bizEvent: BizEventWithEvent[] };
export type ContentWithContentOnEnvironments = Content & {
  contentOnEnvironments: ContentOnEnvironment[];
};
export type VersionWithSteps = Version & { steps: Step[] };
export type VersionWithStepsAndContent = VersionWithSteps & { content: Content };
export type BizSessionWithBizUserAndVersion = BizSession & {
  bizUser: BizUser;
  version: VersionWithSteps;
};
export type BizSessionWithContentAndVersion = BizSession & {
  content: Content;
  version: Version;
};
export type BizSessionWithBizUserContentAndVersion = BizSession & {
  bizUser: BizUser;
  content: Content;
  version: Version;
};

// Transaction client type alias for shorter usage
export type Tx = Prisma.TransactionClient;
