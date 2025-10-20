import * as Prisma from '@prisma/client';

export type Event = Prisma.Event;
export type BizEvent = Prisma.BizEvent;
export type BizSession = Prisma.BizSession;
export type BizCompany = Prisma.BizCompany;
export type BizUser = Prisma.BizUser;
export type Step = Prisma.Step;
export type Version = Prisma.Version;
export type Theme = Prisma.Theme;
export type Content = Prisma.Content;
export type Environment = Prisma.Environment;
export type AttributeOnEvent = Prisma.AttributeOnEvent;
export type Attribute = Prisma.Attribute;
export type BizAnswer = Prisma.BizAnswer;
export type ContentOnEnvironment = Prisma.ContentOnEnvironment;

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
