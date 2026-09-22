import type { Content, ContentOnEnvironment } from '@prisma/client';

export type ContentWithContentOnEnvironments = Content & {
  contentOnEnvironments: ContentOnEnvironment[];
};
