import type { JsonValue } from '@prisma/client/runtime/library';

/** The content-level fields to change — what ContentService.updateContent takes. */
export type ContentChanges = {
  name?: string;
  buildUrl?: string;
  config?: JsonValue;
};
