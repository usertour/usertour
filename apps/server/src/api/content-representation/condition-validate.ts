import { type ValidateContext, validateConditionByType } from '@usertour/helpers';
import type { RulesCondition } from '@usertour/types';

/**
 * Shared semantic validator for a compiled rule tree (conditions + action
 * references), used by every v2/MCP write surface that persists rules: content
 * (publish + dry-run, via usable.validate) and segments (write-time).
 *
 * It deep-walks any compiled fragment and, for each rule node, checks what the
 * builder UI guarantees but the API has no UI to enforce:
 *  - conditions: the referenced attribute/segment/content/event exists, the
 *    operator fits the attribute's data type, required values are present
 *    (delegated to the @usertour/helpers validator, the single source of truth);
 *  - `flow-start` actions: the referenced content exists (a dangling contentId
 *    silently no-ops at runtime — the action just never starts anything).
 *
 * Returns field-pathed issues; callers decide whether to throw (segments, at
 * write) or fold into a usability report (content, at publish/dry-run). Skips
 * any check whose reference list is absent from `ctx` (e.g. no contents loaded
 * → no flow-start check), mirroring "no context → no validation".
 */
export interface RuleIssue {
  path: string;
  message: string;
}

// Condition node types only ever appear as a node's OWN top-level `type`; layout
// elements carry their type under `.element.type`, so walking by top-level
// `type` never mistakes a content block for a condition.
const CONDITION_NODE_TYPES = new Set([
  'user-attr',
  'current-page',
  'segment',
  'content',
  'element',
  'event',
  'event-attr',
  'text-input',
  'text-fill',
  'time',
]);

// i18n keys → human messages for the API/MCP surface (agents read these).
const CONDITION_ERROR_MESSAGES: Record<string, string> = {
  'conditions.errors.userAttr.selectAttribute':
    'user-attribute condition is missing or references an unknown attribute',
  'conditions.errors.userAttr.selectOperator': 'user-attribute condition is missing an operator',
  'conditions.errors.userAttr.invalidOperator':
    'operator is not valid for this attribute’s data type',
  'conditions.errors.userAttr.enterValue': 'condition is missing a required value',
  'conditions.errors.currentPage.enterPattern': 'current-page condition needs a URL pattern',
  'conditions.errors.segment.selectSegment':
    'segment condition is missing or references an unknown segment',
  'conditions.errors.content.selectContent':
    'flow condition is missing or references unknown content',
  'conditions.errors.element.selectElement': 'element condition is missing a target element',
  'conditions.errors.time.enterStart': 'time condition needs a start time',
  'conditions.errors.event.selectEvent':
    'event condition is missing or references an unknown event',
  'conditions.errors.event.enterCount': 'event condition needs a count',
  'conditions.errors.event.enterSecondCount': 'event “between” count needs a second value',
  'conditions.errors.event.enterTimeWindow': 'event condition needs a time window',
  'conditions.errors.event.selectTimeUnit':
    'event time window needs a unit (seconds/minutes/hours/days)',
  'conditions.errors.event.enterSecondTimeWindow': 'event “between” window needs a second value',
  'conditions.errors.eventAttr.selectAttribute':
    'event-attribute condition is missing or references an unknown attribute',
};

export function collectRuleIssues(
  value: unknown,
  ctx: ValidateContext,
  path = 'conditions',
): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const contentIds = ctx.contents ? new Set(ctx.contents.map((c) => c.id)) : undefined;

  const walk = (node: unknown, at: string): void => {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) walk(node[i], `${at}[${i}]`);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    const type = obj.type;
    if (typeof type === 'string') {
      if (CONDITION_NODE_TYPES.has(type)) {
        const issue = validateConditionByType(obj as unknown as RulesCondition, ctx);
        if (issue) {
          issues.push({
            path: at,
            message: CONDITION_ERROR_MESSAGES[issue.key] ?? `invalid condition (${issue.key})`,
          });
        }
      } else if (type === 'flow-start' && contentIds) {
        // A start-flow action that points at content not in the project silently
        // starts nothing at runtime.
        const cid = (obj.data as { contentId?: unknown } | undefined)?.contentId;
        if (typeof cid === 'string' && cid && !contentIds.has(cid)) {
          issues.push({ path: at, message: 'start-flow action references unknown content' });
        }
      } else if (type === 'content-list' && contentIds && Array.isArray(obj.contentItems)) {
        // Resource-center content-list items each link to a flow/checklist; a
        // dangling link renders nothing for that item. The COMPILED block stores
        // them under `contentItems` (each with `contentId`) — see
        // resource-center.compile; reading `items` here silently never fired.
        const items = obj.contentItems as unknown[];
        for (let i = 0; i < items.length; i++) {
          const cid = (items[i] as { contentId?: unknown } | undefined)?.contentId;
          if (typeof cid === 'string' && cid && !contentIds.has(cid)) {
            issues.push({
              path: `${at}.items[${i}]`,
              message: 'resource-center item references unknown content',
            });
          }
        }
      }
    }
    // Recurse into every value — rules nest under group.conditions,
    // event.whereConditions, button actions/disable/hide conditions, etc.
    for (const key of Object.keys(obj)) walk(obj[key], `${at}.${key}`);
  };

  walk(value, path);
  return issues;
}
