import type { JsonValue } from '@prisma/client/runtime/library';

/** A step as the builder sends it — one entry of a version's step list. */
export type StepDraft = {
  id?: string;
  /** Front-end-generated logical id; the upsert key for the whole-version save. */
  cvid?: string;
  sequence?: number;
  name?: string;
  type: string;
  screenshot?: JsonValue;
  themeId?: string;
  setting?: JsonValue;
  data?: JsonValue;
  trigger?: JsonValue;
  target?: JsonValue;
};
