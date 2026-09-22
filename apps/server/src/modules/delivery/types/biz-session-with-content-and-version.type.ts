import type { BizSession, Content, Version } from '@prisma/client';

export type BizSessionWithContentAndVersion = BizSession & {
  content: Content;
  version: Version;
};
