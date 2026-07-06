import { ContentActionsItemType, ContentDataType } from '@usertour/types';

import type { ValidationIssue } from '@/common/errors/errors';

import {
  REACTIVE_REJECTED_REP_CONDITION_TYPES,
  contentActionCapabilities,
  stepCapabilities,
} from './contract-map';

/**
 * The single write-time contract walk. One traversal over everything a version
 * write can carry — `steps`, `data`, `startRules.when`, `hideRules.when` — that
 * COLLECTS every violation (instead of throwing on the first) and every
 * cross-content reference (for the caller's batch target-type check). The rules
 * come from the capability matrix (via contract-map); this module owns only the
 * traversal and the entry list.
 *
 * Why one walk: the guards used to be four independent recursive walkers, each
 * privately remembering which entries to cover — and every historical gap
 * (body.data missed by the reactive guard; two of the three reference carriers
 * missed) came from an entry list going stale. Here the entry list exists once.
 *
 * Rules enforced (each maps to a ValidationIssue `rule`):
 *  - `reactive_condition`: reactive slots — a step trigger's `when`, a button's
 *    `hiddenWhen`/`disabledWhen`, a tracker's start conditions — are polled live
 *    in the browser, so server-evaluated condition types (event / segment /
 *    content-state) can never fire there. The builder omits them; reject them.
 *  - `action_not_allowed`: a non-flow body can't carry `goto_step` (no steps to
 *    go to), and a type without a dismiss variant (resource center) can't carry
 *    `dismiss` (it would compile to flow-dismiss and silently no-op).
 *  - `step_shape`: placement shape must match the step kind (tooltip→{side,align},
 *    modal→{position}; wrong-shape fields are silently dropped otherwise), and
 *    onClick (click-the-target-to-advance) only works on a tooltip.
 * checklist `completeWhen` / RC `onlyShowWhen` intentionally allow the full
 * condition set — only the reactive slots above are restricted.
 */

export type ContentReference = {
  /** The referenced contentId. */
  id: string;
  /** Where in the body it sits (issue path). */
  path: string;
  /** Which entry it came from — used in the human message ("in a start rule"). */
  where: string;
  /** The carrier, for the message ("A content-state condition" / …). */
  kind: string;
};

export type WriteWalkResult = { issues: ValidationIssue[]; refs: ContentReference[] };

export function collectWriteViolations(input: {
  steps?: unknown;
  data?: unknown;
  startRules?: { when?: unknown } | null;
  hideRules?: { when?: unknown } | null;
  contentType?: string;
}): WriteWalkResult {
  const issues: ValidationIssue[] = [];
  const refs: ContentReference[] = [];

  // ── rule helpers ───────────────────────────────────────────────────────────

  /** Reactive-slot condition check: each condition node, recursing into groups. */
  const reactiveConditions = (conditions: unknown, path: string, slot: string): void => {
    if (!Array.isArray(conditions)) return;
    conditions.forEach((c, i) => {
      const at = `${path}[${i}]`;
      const type = (c as { type?: unknown })?.type;
      if (typeof type === 'string' && REACTIVE_REJECTED_REP_CONDITION_TYPES.has(type)) {
        issues.push({
          rule: 'reactive_condition',
          path: at,
          message: `A "${type}" condition can't be used in ${slot} (at ${at}) — that is evaluated live in the browser and supports only attribute / current_url / element / text_input / text_filled / time conditions. Event / segment / content-state conditions are server-evaluated and aren't supported here.`,
        });
      }
      if (type === 'group') {
        reactiveConditions((c as { conditions?: unknown }).conditions, `${at}.conditions`, slot);
      }
    });
  };

  /** Per-step shape: placement shape by kind + onClick only where it can fire. */
  const stepShape = (step: unknown, i: number): void => {
    if (!step || typeof step !== 'object') return;
    const s = step as Record<string, unknown>;
    const type = s.type;
    const at = `steps[${i}]`;
    const caps = stepCapabilities(type);
    const placement = s.placement as Record<string, unknown> | undefined;
    if (placement && typeof placement === 'object' && caps) {
      // Placement is a 2-member union: a `position` key = modal shape; anything
      // else (side/align/alignType/offsets, or even an empty object now that
      // side/align are optional) = tooltip shape. Keyed on the sole modal
      // discriminant so a partial tooltip shape (e.g. only `align`) on a modal
      // step is still flagged.
      const isModalShape = 'position' in placement;
      const isTooltipShape = !isModalShape;
      if (caps.placement === 'anchor' && isModalShape) {
        issues.push({
          rule: 'step_shape',
          path: `${at}.placement`,
          message: `A tooltip step (${at}) needs a tooltip placement { side, align } anchored to its target — it can't use a modal placement { position }, which would be ignored.`,
        });
      }
      if (caps.placement === 'grid' && isTooltipShape) {
        issues.push({
          rule: 'step_shape',
          path: `${at}.placement`,
          message: `A modal step (${at}) needs a modal placement { position } on the viewport grid — it can't use a tooltip placement { side, align }, which would be ignored.`,
        });
      }
    }
    const onClick = s.onClick;
    if (Array.isArray(onClick) && onClick.length > 0 && !caps?.onClick) {
      issues.push({
        rule: 'step_shape',
        path: `${at}.onClick`,
        message: `onClick (click the target element to advance) only works on a tooltip step; a ${String(
          type,
        )} step (${at}) has no target element to click, so the action would never fire. Use a step trigger or a button action instead.`,
      });
    }
  };

  /** Button blocks (any nesting, incl. columns): hiddenWhen/disabledWhen are reactive. */
  const buttonReactive = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => buttonReactive(n, `${path}[${i}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (obj.type === 'button') {
      reactiveConditions(obj.hiddenWhen, `${path}.hiddenWhen`, "a button's show/hide rule");
      reactiveConditions(
        obj.disabledWhen,
        `${path}.disabledWhen`,
        "a button's enable/disable rule",
      );
    }
    for (const key of Object.keys(obj)) {
      buttonReactive(obj[key], `${path}.${key}`);
    }
  };

  /** Cross-content references, wherever they sit (the caller checks target types). */
  const collectRefs = (node: unknown, path: string, where: string): void => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => collectRefs(n, `${path}[${i}]`, where));
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (obj.type === 'content_state' && typeof obj.content === 'string') {
      refs.push({ id: obj.content, path, where, kind: 'A content-state condition' });
    } else if (obj.type === 'start_content' && typeof obj.content === 'string') {
      refs.push({ id: obj.content, path, where, kind: 'A start_content action' });
    } else if (typeof obj.content === 'string' && typeof obj.contentType === 'string') {
      // A resource-center content-list item: { content: <id>, contentType: 'flow'|'checklist' }.
      refs.push({ id: obj.content, path, where, kind: 'A resource-center content-list item' });
    }
    for (const key of Object.keys(obj)) {
      collectRefs(obj[key], `${path}.${key}`, where);
    }
  };

  /** Non-flow data: action types the host's slots don't offer (capability matrix). */
  const dataActions = (data: unknown, contentType: string): void => {
    const caps = contentActionCapabilities(contentType);
    // goto_step is flow-only — every non-flow type's action set excludes STEP_GOTO
    // (unknown type: reject too; compile rejects the type right after).
    const rejectGotoStep = !caps?.actions.includes(ContentActionsItemType.STEP_GOTO);
    // A type with action slots but no dismiss variant (resource center) can't dismiss;
    // types with no action slots at all (tracker) are left to their own schema.
    const rejectDismiss = caps !== undefined && caps.actions.length > 0 && !caps.dismissVariant;
    const slotHint = `a ${contentType}'s content`;
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((n, i) => walk(n, `${path}[${i}]`));
        return;
      }
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      if (rejectGotoStep && obj.type === 'goto_step') {
        issues.push({
          rule: 'action_not_allowed',
          path,
          message: `A "goto_step" action can't be used in ${slotHint} (at ${path}). goto_step navigates between the steps of a flow, and this content type has no steps — use start_content, page_navigate, or dismiss instead.`,
        });
      }
      if (rejectDismiss && obj.type === 'dismiss') {
        issues.push({
          rule: 'action_not_allowed',
          path,
          message: `A "dismiss" action can't be used in ${slotHint} (at ${path}). A resource center has no dismiss action — use start_content or page_navigate, or let its built-in close button dismiss it.`,
        });
      }
      for (const key of Object.keys(obj)) {
        walk(obj[key], `${path}.${key}`);
      }
    };
    walk(data, 'data');
  };

  // ── THE entry list (the one place that knows where rules apply) ─────────────

  // steps (flow): shape per step, reactive slots (trigger when + button rules), refs.
  if (Array.isArray(input.steps)) {
    input.steps.forEach((s, i) => {
      stepShape(s, i);
      const step = s as { triggers?: { when?: unknown }[]; content?: unknown };
      (step.triggers ?? []).forEach((t, ti) =>
        reactiveConditions(t?.when, `steps[${i}].triggers[${ti}].when`, 'a step trigger'),
      );
      buttonReactive(step.content, `steps[${i}].content`);
    });
    collectRefs(input.steps, 'steps', 'a step');
  }

  // data (non-flow body): action-type rules, button reactive slots, refs.
  if (input.data !== undefined) {
    if (input.contentType) {
      dataActions(input.data, input.contentType);
    }
    buttonReactive(input.data, 'data');
    collectRefs(input.data, 'data', "the content's data");
  }

  // start / hide rules: refs; a tracker's start conditions are a reactive slot
  // (they fire the tracker's event live in the browser).
  collectRefs(input.startRules?.when, 'startRules.when', 'a start rule');
  collectRefs(input.hideRules?.when, 'hideRules.when', 'a hide rule');
  if (input.contentType === ContentDataType.TRACKER) {
    reactiveConditions(input.startRules?.when, 'startRules.when', "a tracker's start conditions");
  }

  return { issues, refs };
}
