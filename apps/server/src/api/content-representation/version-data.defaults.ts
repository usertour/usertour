import { JsonValue } from '@prisma/client/runtime/library';
import {
  DEFAULT_BANNER_DATA,
  DEFAULT_CHECKLIST_DATA,
  DEFAULT_LAUNCHER_DATA,
  DEFAULT_RESOURCE_CENTER_DATA,
} from '@usertour/constants';

/**
 * The default `version.data` for a freshly created non-flow content. The builder
 * seeds these via its create form; the v2 create path must too, so a later
 * partial `update_content_version` (which field-level merges onto the existing
 * data) lands on a complete, renderable base instead of a half-built object
 * missing its structural fields (e.g. a banner with no `embedPlacement`, a
 * checklist with no `initialDisplay`).
 *
 * `flow` (authored via `steps`) and `tracker` (whose `eventId` is a meaningful
 * value the author supplies) get no seed.
 */
export function defaultVersionData(type: string): JsonValue | undefined {
  switch (type) {
    case 'checklist':
      return structuredClone(DEFAULT_CHECKLIST_DATA) as unknown as JsonValue;
    case 'launcher':
      return structuredClone(DEFAULT_LAUNCHER_DATA) as unknown as JsonValue;
    case 'banner':
      return structuredClone(DEFAULT_BANNER_DATA) as unknown as JsonValue;
    case 'resource-center':
      return structuredClone(DEFAULT_RESOURCE_CENTER_DATA) as unknown as JsonValue;
    default:
      return undefined;
  }
}
