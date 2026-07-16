import { AUTO_START_CAPABILITIES } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';

import {
  REACTIVE_REJECTED_REP_CONDITION_TYPES,
  REP_CONDITION_TYPE_TO_INTERNAL,
} from './contract-map';

import {
  RepresentationCondition,
  RepresentationHideRules,
  RepresentationStartRules,
} from './representation.schema';

/**
 * Reject auto-start settings a content type doesn't support. The builder hides
 * these controls per type (AUTO_START_CAPABILITIES, the shared SSOT); the v2/MCP
 * write path must enforce the same contract so an API client can't set what the
 * UI forbids — e.g. a `frequency` on a launcher (which would cap it at a single
 * show) or `hideRules` on a banner. Returns human-readable violation messages
 * (empty = OK). Clearing rules (a null body) is always allowed.
 *
 * Where a type narrows its allowed start-condition types (tracker), `when`
 * conditions outside that whitelist are also rejected — recursively, so a banned
 * type nested in a group is caught too.
 */
// The client-evaluable representation condition types — the general vocabulary
// minus the server-evaluated set. This is the whitelist for a type whose start
// conditions are a reactive slot (tracker: clientConditionsOnly). Derived from
// the capability matrix via the codec's name map, so it can't drift from the
// builder pickers or the write guards. `unsupported` (not in the map) stays
// rejected, matching the previous hand-kept whitelist.
const CLIENT_EVALUABLE_REP_CONDITION_TYPES: ReadonlySet<string> = new Set(
  Object.keys(REP_CONDITION_TYPE_TO_INTERNAL).filter(
    (type) => !REACTIVE_REJECTED_REP_CONDITION_TYPES.has(type),
  ),
);

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
    if (startRules.waitSeconds !== undefined && !caps.wait) {
      errs.push(unsupported('a start `waitSeconds`'));
    }
    if (startRules.startIfNotComplete !== undefined && !caps.ifCompleted) {
      errs.push(unsupported('`startIfNotComplete`'));
    }
    if (caps.clientConditionsOnly) {
      const allowed = CLIENT_EVALUABLE_REP_CONDITION_TYPES;
      const offending = new Set<string>();
      const walk = (conds: RepresentationCondition[] | undefined) => {
        for (const c of conds ?? []) {
          // Groups are structural containers — always allowed; check their children.
          if (c.type === 'group') {
            walk(c.conditions);
          } else if (!allowed.has(c.type)) {
            offending.add(c.type);
          }
        }
      };
      walk(startRules.when);
      for (const type of offending) {
        errs.push(unsupported(`a \`${type}\` start condition`));
      }
    }
    if (caps.startConditionTypes) {
      // The type's `when` is restricted to an explicit whitelist (announcement:
      // a server-side audience filter — user-attribute / segment only). Translate
      // the internal whitelist to representation names for the check + message.
      const allowedInternal = new Set<string>(caps.startConditionTypes);
      const allowedRepNames = Object.entries(REP_CONDITION_TYPE_TO_INTERNAL)
        .filter(([, internal]) => allowedInternal.has(internal))
        .map(([rep]) => rep)
        .filter((rep) => rep !== 'group');
      const offending = new Set<string>();
      const walk = (conds: RepresentationCondition[] | undefined) => {
        for (const c of conds ?? []) {
          if (c.type === 'group') {
            walk(c.conditions);
          } else {
            const internal = REP_CONDITION_TYPE_TO_INTERNAL[c.type];
            if (!internal || !allowedInternal.has(internal)) {
              offending.add(c.type);
            }
          }
        }
      };
      walk(startRules.when);
      for (const type of offending) {
        errs.push(
          unsupported(
            `a \`${type}\` start condition — this type's targeting supports only: ${allowedRepNames.join(', ')}`,
          ),
        );
      }
    }
  }

  if (hideRules && !caps.hideRules) {
    errs.push(unsupported('`hideRules`'));
  }

  return errs;
}
