import type { JsonValue } from '@prisma/client/runtime/library';

/** A version to fork from an existing one — what ContentService.createContentVersion takes. */
export type NewContentVersion = {
  versionId: string;
  config?: JsonValue;
};
