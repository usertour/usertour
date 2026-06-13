import { DEFAULT_FREQUENCY, cuid } from '@usertour/helpers';

import { ParamsError } from '@/common/errors';

import {
  CompilableCondition,
  RepresentationAction,
  RepresentationHideRules,
  RepresentationStartRules,
  RepresentationTrigger,
} from './representation.schema';
import { compileTargetToElementData } from './target.compile';
import { compileText } from './text.compile';

/**
 * Compile the representation rules model back into internal `RulesCondition[]` /
 * `StepTrigger[]` — the inverse of rules.decompile. References are resolved from
 * stable code back to internal id (attribute / event); segment / content stay by
 * id. `run_javascript` is rejected (read-only).
 */
export interface CompileResolvers {
  attributeId: (code: string) => string;
  eventId: (code: string) => string;
  /**
   * Resolve an EVENT-scoped attribute code → internal id (for `event_attribute`
   * conditions inside an event's `where`). Event attributes live in their own
   * bizType namespace, where a codeName may collide with a user attribute, so
   * this must be a separate map. Falls back to `attributeId` when absent.
   */
  eventAttributeId?: (code: string) => string;
  /**
   * Resolve a `goto_step` target reference (an author `key` or an existing
   * `cvid`) to the real step cvid. Present only when compiling flow steps; the
   * caller builds it from the step list in the same write. Falls back to passing
   * the reference through unchanged when absent.
   */
  stepCvid?: (ref: string) => string;
}

type Rule = { id: string; type: string; data: any; operators?: 'and' | 'or'; conditions?: Rule[] };

// representation op → internal logic (inverse of the decompile maps).
const ATTR_LOGIC: Record<string, string> = {
  is: 'is',
  not: 'not',
  contains: 'contains',
  not_contains: 'notContain',
  starts_with: 'startsWith',
  ends_with: 'endsWith',
  match: 'match',
  unmatch: 'unmatch',
  any: 'any',
  empty: 'empty',
  lt: 'isLessThan',
  lte: 'isLessThanOrEqualTo',
  gt: 'isGreaterThan',
  gte: 'isGreaterThanOrEqualTo',
  between: 'between',
  true: 'true',
  false: 'false',
  includes_any: 'includesAtLeastOne',
  includes_all: 'includesAll',
  not_includes_any: 'notIncludesAtLeastOne',
  not_includes_all: 'notIncludesAll',
  less_than: 'lessThan',
  exactly: 'exactly',
  more_than: 'moreThan',
  before: 'before',
  on: 'on',
  after: 'after',
};
const ELEMENT_LOGIC: Record<string, string> = {
  present: 'present',
  hidden: 'unpresent',
  disabled: 'disabled',
  enabled: 'undisabled',
  clicked: 'clicked',
  unclicked: 'unclicked',
};
const CONTENT_LOGIC: Record<string, string> = {
  seen: 'seen',
  unseen: 'unseen',
  completed: 'completed',
  uncompleted: 'uncompleted',
  active: 'actived',
  inactive: 'unactived',
};
const COUNT_LOGIC: Record<string, string> = {
  at_least: 'atLeast',
  at_most: 'atMost',
  exactly: 'exactly',
  between: 'between',
};
const TIME_LOGIC: Record<string, string> = {
  in_the_last: 'inTheLast',
  more_than: 'moreThan',
  between: 'between',
  any_time: 'atAnyPointInTime',
};
const SCOPE: Record<string, string> = {
  current_user: 'byCurrentUserInAnyCompany',
  current_user_in_company: 'byCurrentUserInCurrentCompany',
  any_user_in_company: 'byAnyUserInCurrentCompany',
};

const rule = (type: string, data: any, extra?: Partial<Rule>): Rule => ({
  id: cuid(),
  type,
  data,
  ...extra,
});

/**
 * Compile a flat condition list, stamping each node with the list's and/or
 * `operators`. The runtime combines a list by reading `conditions[0].operators`
 * (helpers/conditions/condition.ts) — a missing value falls through to OR — so
 * every node MUST carry it or an intended AND silently evaluates as OR.
 *
 * `joiner` is the connector for THIS list: top-level `when` lists are AND by
 * convention (OR is expressed by wrapping in a `group`, see decompileWhen), and
 * a group's children take the group's `match`. A group NODE itself is stamped by
 * the list it sits in (its parent's joiner), not by its own match — which is why
 * the stamp happens here, in the parent's map, rather than inside the group case.
 */
export function compileConditions(
  conditions: CompilableCondition[] | undefined,
  r: CompileResolvers,
  joiner: 'and' | 'or' = 'and',
): Rule[] {
  return (conditions ?? [])
    .filter((c) => c.type !== 'unsupported')
    .map((c) => ({ ...compileCondition(c, r), operators: joiner }));
}

function compileCondition(c: CompilableCondition, r: CompileResolvers): Rule {
  switch (c.type) {
    case 'group':
      // The group's `match` governs ITS children's joiner. The group node's own
      // `operators` is set by compileConditions above (the parent list's joiner).
      return rule(
        'group',
        {},
        {
          conditions: compileConditions(c.conditions, r, c.match === 'any' ? 'or' : 'and'),
        },
      );
    case 'user_attribute':
      return rule('user-attr', {
        attrId: r.attributeId(c.attribute),
        logic: ATTR_LOGIC[c.op] ?? c.op,
        ...(c.value !== undefined ? { value: c.value } : {}),
        ...(c.value2 !== undefined ? { value2: c.value2 } : {}),
        ...(c.values !== undefined ? { listValues: c.values } : {}),
      });
    case 'event_attribute':
      // Same shape as user-attr, but the attribute resolves against the event's
      // own (bizType=event) attributes — a user attribute and an event attribute
      // can share a codeName, so a distinct resolver is needed to disambiguate.
      return rule('event-attr', {
        attrId: (r.eventAttributeId ?? r.attributeId)(c.attribute),
        logic: ATTR_LOGIC[c.op] ?? c.op,
        ...(c.value !== undefined ? { value: c.value } : {}),
        ...(c.value2 !== undefined ? { value2: c.value2 } : {}),
        ...(c.values !== undefined ? { listValues: c.values } : {}),
      });
    case 'task_clicked':
      // Parameterless: a checklist task completes when its item is clicked.
      return rule('task-is-clicked', {});
    case 'segment':
      return rule('segment', { segmentId: c.segment, logic: c.in ? 'is' : 'not' });
    case 'current_url':
      return rule('current-page', { includes: c.includes, excludes: c.excludes ?? [] });
    case 'element':
      return rule('element', {
        elementData: compileTargetToElementData(c.target),
        logic: ELEMENT_LOGIC[c.state] ?? 'present',
      });
    case 'flow':
      return rule('content', { contentId: c.flow, logic: CONTENT_LOGIC[c.state] ?? 'seen' });
    case 'event':
      return rule('event', {
        eventId: r.eventId(c.event),
        ...(c.count
          ? {
              countLogic: COUNT_LOGIC[c.count.op] ?? 'atLeast',
              count: c.count.n,
              ...(c.count.n2 !== undefined ? { count2: c.count.n2 } : {}),
            }
          : {}),
        ...(c.within
          ? {
              timeLogic: TIME_LOGIC[c.within.op] ?? 'atAnyPointInTime',
              ...(c.within.value !== undefined ? { windowValue: c.within.value } : {}),
              ...(c.within.value2 !== undefined ? { windowValue2: c.within.value2 } : {}),
              ...(c.within.unit ? { timeUnit: c.within.unit } : {}),
            }
          : {}),
        ...(c.scope ? { scope: SCOPE[c.scope] } : {}),
        ...(c.where
          ? { whereConditions: compileConditions(c.where as CompilableCondition[], r) }
          : {}),
      });
    case 'text_input':
      return rule('text-input', {
        elementData: compileTargetToElementData(c.target),
        logic: ATTR_LOGIC[c.op] ?? c.op,
        ...(c.value !== undefined ? { value: c.value } : {}),
      });
    case 'text_filled':
      return rule('text-fill', { elementData: compileTargetToElementData(c.target) });
    case 'time_window':
      return rule('time', {
        ...(c.start ? { startTime: c.start } : {}),
        ...(c.end ? { endTime: c.end } : {}),
      });
    default:
      // `unsupported` is filtered out by compileConditions; nothing else remains.
      throw new ParamsError(`Cannot write condition: ${(c as { type: string }).type}`);
  }
}

/**
 * The internal `dismiss` action splits by host content type — each renderer
 * registers only its own dismiss handler (flow/checklist/banner/launcher), and
 * a mismatched type finds no handler and silently no-ops. The representation has
 * one `dismiss`; the host's type is supplied here so it compiles to the right
 * variant. Defaults to `flow-dismis` (flow steps, the common case).
 */
export type DismissVariant =
  | 'flow-dismis'
  | 'checklist-dismis'
  | 'banner-dismis'
  | 'launcher-dismis';

export function compileActions(
  actions: RepresentationAction[] | undefined,
  r?: CompileResolvers,
  dismiss: DismissVariant = 'flow-dismis',
): Rule[] {
  return (actions ?? [])
    .filter((a) => a.type !== 'unsupported')
    .map((a) => compileAction(a, r, dismiss));
}

function compileAction(
  a: RepresentationAction,
  r?: CompileResolvers,
  dismiss: DismissVariant = 'flow-dismis',
): Rule {
  switch (a.type) {
    case 'goto_step':
      return rule('step-goto', { stepCvid: r?.stepCvid ? r.stepCvid(a.step) : a.step });
    case 'start_flow':
      return rule('flow-start', { contentId: a.flow, ...(a.step ? { stepCvid: a.step } : {}) });
    case 'navigate':
      // The URL is stored as a Slate rich-text `value` (the builder + runtime read
      // `data.value` and serialize it — this is what lets `{{ attribute }}` work in
      // URLs), NOT a plain `url` string. compileText turns the url into that node
      // shape; decompile reads it back via decompileText(d.value).
      return rule('page-navigate', {
        value: compileText(a.url),
        ...(a.newTab ? { openType: 'new', openNewTab: true } : { openType: 'same' }),
        ...(a.newWindow ? { openNewWindow: true } : {}),
      });
    case 'dismiss':
      return rule(dismiss, {});
    case 'run_javascript':
      throw new ParamsError('run_javascript cannot be set via the API');
    default:
      throw new ParamsError(`Cannot write action: ${(a as { type: string }).type}`);
  }
}

export function compileTriggers(
  triggers: RepresentationTrigger[] | undefined,
  r: CompileResolvers,
  dismiss: DismissVariant = 'flow-dismis',
): Rule[] {
  return (triggers ?? []).map((t) => ({
    id: cuid(),
    conditions: compileConditions(t.when, r),
    actions: compileActions(t.do, r, dismiss),
    ...(t.waitMs !== undefined ? { wait: t.waitMs } : {}),
  })) as unknown as Rule[];
}

/** Compile version-level start rules back into config fragments. */
export function compileStartRules(
  start: RepresentationStartRules | undefined,
  r: CompileResolvers,
) {
  if (!start) {
    return { enabledAutoStartRules: false, autoStartRules: [] };
  }
  const setting: any = {};
  if (start.frequency) {
    // `multiple` / `unlimited` render the "every N times" control, which reads
    // `every.times` — so `every` MUST be present for those modes (a bare `{ mode }`
    // otherwise crashes the builder picker and breaks SDK frequency evaluation).
    // Default it from DEFAULT_FREQUENCY, merging any caller-provided fields. `once`
    // doesn't use `every`, and `atLeast` is optional (guarded by the picker), so
    // neither is synthesized.
    const needsEvery = start.frequency.mode === 'multiple' || start.frequency.mode === 'unlimited';
    setting.frequency = {
      frequency: start.frequency.mode,
      ...(start.frequency.every || needsEvery
        ? { every: { ...DEFAULT_FREQUENCY.every, ...(start.frequency.every ?? {}) } }
        : {}),
      ...(start.frequency.atLeast ? { atLeast: start.frequency.atLeast } : {}),
    };
  }
  if (start.priority) {
    setting.priority = start.priority;
  }
  if (start.waitMs !== undefined) setting.wait = start.waitMs;
  if (start.startIfNotComplete !== undefined) setting.startIfNotComplete = start.startIfNotComplete;
  return {
    enabledAutoStartRules: true,
    autoStartRules: compileConditions(start.when, r),
    ...(Object.keys(setting).length ? { autoStartRulesSetting: setting } : {}),
  };
}

/** Compile version-level hide rules back into config fragments. */
export function compileHideRules(
  hide: RepresentationHideRules | null | undefined,
  r: CompileResolvers,
) {
  if (!hide) {
    return { enabledHideRules: false, hideRules: [] };
  }
  return { enabledHideRules: true, hideRules: compileConditions(hide.when, r) };
}
