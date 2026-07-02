import {
  CONTENT_ACTION_CAPABILITIES,
  CONTENT_REFERENCE_TARGET_TYPES,
  SERVER_EVALUATED_CONDITION_TYPES,
  STEP_CAPABILITIES,
  type ContentActionCapabilities,
  type StepCapabilities,
} from '@usertour/helpers';
import {
  ContentActionsItemType,
  ContentDataType,
  RulesType,
  StepContentType,
} from '@usertour/types';

import type { DismissVariant } from './rules.compile';

/**
 * The representation-side adapter for the capability matrix
 * (@usertour/helpers/capability-matrix). The matrix speaks the INTERNAL
 * vocabulary (@usertour/types enums); the v2 representation speaks its own
 * names. This file owns that name mapping — the same correspondence the codec's
 * compile/decompile switches implement — plus the derived sets the write guards
 * consume, so a rule change in the matrix reaches the guards without anyone
 * re-hand-copying a list.
 */

/** Representation condition type → internal RulesType (general condition set). */
export const REP_CONDITION_TYPE_TO_INTERNAL: Record<string, RulesType> = {
  group: RulesType.GROUP,
  attribute: RulesType.USER_ATTR,
  segment: RulesType.SEGMENT,
  current_url: RulesType.CURRENT_PAGE,
  element: RulesType.ELEMENT,
  content_state: RulesType.CONTENT,
  event: RulesType.EVENT,
  text_input: RulesType.TEXT_INPUT,
  text_filled: RulesType.TEXT_FILL,
  time_window: RulesType.TIME,
};

/**
 * Representation action type → internal action type. `dismiss` is absent on
 * purpose: it maps to a HOST-SPECIFIC variant (see dismissVariantFor).
 */
export const REP_ACTION_TYPE_TO_INTERNAL: Record<string, ContentActionsItemType> = {
  goto_step: ContentActionsItemType.STEP_GOTO,
  start_content: ContentActionsItemType.FLOW_START,
  navigate: ContentActionsItemType.PAGE_NAVIGATE,
  run_javascript: ContentActionsItemType.JAVASCRIPT_EVALUATE,
};

/**
 * Representation condition names rejected in reactive slots (step triggers,
 * button show/hide/disable rules, tracker start conditions) — the
 * server-evaluated types, translated to representation vocabulary.
 * Derived, not hand-copied: = {'event', 'segment', 'flow'} today.
 */
export const REACTIVE_REJECTED_REP_CONDITION_TYPES: ReadonlySet<string> = new Set(
  Object.entries(REP_CONDITION_TYPE_TO_INTERNAL)
    .filter(([, internal]) => SERVER_EVALUATED_CONDITION_TYPES.includes(internal))
    .map(([rep]) => rep),
);

/** Action capabilities for a content type; undefined for an unknown type string. */
export function contentActionCapabilities(
  contentType: string,
): ContentActionCapabilities | undefined {
  return CONTENT_ACTION_CAPABILITIES[contentType as ContentDataType];
}

/**
 * The DismissVariant the codec compiles a representation `dismiss` to for this
 * host content type. Only meaningful for types that HAVE a dismiss action —
 * callers for variant-less types (resource center) reject dismiss upstream and
 * never ask.
 */
export function dismissVariantFor(contentType: ContentDataType): DismissVariant {
  const variant = CONTENT_ACTION_CAPABILITIES[contentType]?.dismissVariant;
  return (variant ?? ContentActionsItemType.FLOW_DISMIS) as unknown as DismissVariant;
}

/** Step-kind capabilities; undefined for an unknown step type string. */
export function stepCapabilities(stepType: unknown): StepCapabilities | undefined {
  return typeof stepType === 'string' ? STEP_CAPABILITIES[stepType as StepContentType] : undefined;
}

/** Valid cross-content reference target types, as a lookup set. */
export const CONTENT_REFERENCE_TARGET_TYPE_SET: ReadonlySet<string> = new Set(
  CONTENT_REFERENCE_TARGET_TYPES,
);
