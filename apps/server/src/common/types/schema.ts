import * as Prisma from '@prisma/client';

export type BizEvent = Prisma.BizEvent;
export type BizEventWithEvent = Prisma.BizEvent & { event: Prisma.Event };
export type BizSessionWithEvents = Prisma.BizSession & { bizEvent: BizEventWithEvent[] };
export type BizCompany = Prisma.BizCompany;
export type BizSession = Prisma.BizSession;
export type BizUser = Prisma.BizUser;
export type Step = Prisma.Step;
export type Version = Prisma.Version;
export type Theme = Prisma.Theme;
export type Content = Prisma.Content;
export type ContentOnEnvironment = Prisma.ContentOnEnvironment;
export type ContentWithContentOnEnvironments = Content & {
  contentOnEnvironments: ContentOnEnvironment[];
};
export type VersionWithSteps = Version & { steps: Step[] };
export type VersionWithStepsAndContent = VersionWithSteps & { content: Content };
export type Environment = Prisma.Environment;
export type AttributeOnEvent = Prisma.AttributeOnEvent;
export type Attribute = Prisma.Attribute;
export type Event = Prisma.Event;
export type BizAnswer = Prisma.BizAnswer;
export type BizSessionWithBizUserAndVersion = BizSession & {
  bizUser: BizUser;
  version: VersionWithSteps;
};
export type BizSessionWithContentAndVersion = BizSession & {
  content: Content;
  version: Version;
};
