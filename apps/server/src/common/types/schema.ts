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
export type VersionWithStepsAndContent = Version & {
  steps: Step[];
  content: Content;
};
export type Environment = Prisma.Environment;
