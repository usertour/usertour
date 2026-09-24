import type { JsonValue } from '@prisma/client/runtime/library';

import type { StepDraft } from './step-draft.type';

/**
 * The fields of a version to write. When `steps` is present the whole step
 * list is upserted by cvid (the builder's save path); the detail page omits it.
 */
export type VersionDraft = {
  themeId?: string;
  config?: JsonValue;
  data?: JsonValue;
  scheduledAt?: Date;
  steps?: StepDraft[];
};
