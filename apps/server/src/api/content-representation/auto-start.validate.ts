import { AUTO_START_CAPABILITIES } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';

import { RepresentationHideRules, RepresentationStartRules } from './representation.schema';

/**
 * Reject auto-start settings a content type doesn't support. The builder hides
 * these controls per type (AUTO_START_CAPABILITIES, the shared SSOT); the v2/MCP
 * write path must enforce the same contract so an API client can't set what the
 * UI forbids — e.g. a `frequency` on a launcher (which would cap it at a single
 * show) or `hideRules` on a banner. Returns human-readable violation messages
 * (empty = OK). Clearing rules (a null body) is always allowed.
 *
 * Note: only the per-type *settings* are checked here — `when` conditions are
 * always allowed (every type supports targeting conditions). Tracker's narrower
 * condition-type whitelist is not enforced here.
 */
export function validateAutoStartForType(
  startRules: RepresentationStartRules | null | undefined,
  hideRules: RepresentationHideRules | null | undefined,
  contentType: string | undefined,
): string[] {
  const caps = contentType ? AUTO_START_CAPABILITIES[contentType as ContentDataType] : undefined;
  // Unknown type — leave it to the other validators rather than guess.
  if (!caps) {
    return [];
  }

  const errs: string[] = [];
  const unsupported = (what: string) => `${contentType} content does not support ${what}.`;

  if (startRules) {
    if (startRules.frequency && !caps.frequency) {
      errs.push(unsupported('a start `frequency`'));
    }
    if (startRules.frequency?.atLeast && !caps.atLeast) {
      errs.push(unsupported('a frequency `atLeast` window'));
    }
    if (startRules.priority !== undefined && !caps.priority) {
      errs.push(unsupported('a start `priority`'));
    }
    if (startRules.waitMs !== undefined && !caps.wait) {
      errs.push(unsupported('a start `waitMs`'));
    }
    if (startRules.startIfNotComplete !== undefined && !caps.ifCompleted) {
      errs.push(unsupported('`startIfNotComplete`'));
    }
  }

  if (hideRules && !caps.hideRules) {
    errs.push(unsupported('`hideRules`'));
  }

  return errs;
}
