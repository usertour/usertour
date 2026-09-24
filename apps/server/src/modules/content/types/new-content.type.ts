import type { JsonValue } from '@prisma/client/runtime/library';

import type { StepDraft } from './step-draft.type';

/** A content to create with its first version — what ContentService.createContent takes. */
export type NewContent = {
  type: string;
  name?: string;
  buildUrl?: string;
  environmentId?: string;
  themeId?: string;
  config?: JsonValue;
  data?: JsonValue;
  steps?: StepDraft[];
};
