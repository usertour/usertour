import { DEFAULT_FREQUENCY, cuid } from '@usertour/helpers';

import { ValidationError } from '@/common/errors';

import {
  CompilableCondition,
  RepresentationAction,
  RepresentationHideRules,
  RepresentationStartRules,
  RepresentationTrigger,
} from './representation.schema';
import { ATTR_OP_TO_LOGIC } from './attr-ops';
import { compileTargetToElementData } from './target.compile';
import { compilePlainText } from './text.compile';

/**
 * Compile the representation rules model back into internal `RulesCondition[]` /
 * `StepTrigger[]` — the inverse of rules.decompile. References are resolved from
 * stable code back to internal id (attribute / event); segment / content stay by
 * id. `run_javascript` is rejected (read-only).
 */
export type AttributeScope = 'user' | 'company' | 'companyMembership';

export interface CompileResolvers {
  /**
   * Resolve an attribute code → internal id WITHIN the given scope. A codeName can
   * exist for user / company / companyMembership, so the `attribute` condition's
   * `scope` disambiguates. Defaults to `user`.
   */
  attributeId: (code: string, scope?: AttributeScope) => string;
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

// representation op → internal logic — single source of truth in attr-ops.ts.
const ATTR_LOGIC: Record<string, string> = ATTR_OP_TO_LOGIC;
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
    case 'attribute':
      // Compiles to the internal `user-attr` type; `scope` picks which attribute the
      // codeName resolves to (user / company / companyMembership). Eval then dispatches
      // on the resolved attribute's bizType.
      return rule('user-attr', {
        attrId: r.attributeId(c.attribute, c.scope),
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
    case 'content_state':
      return rule('content', { contentId: c.content, logic: CONTENT_LOGIC[c.state] ?? 'seen' });
    case 'event':
      return rule('event', {
        eventId: r.eventId(c.event),
        // Like `within`: `count` is optional in the representation, but a MISSING
        // count is dangerous — the runtime coerces it to 0 (`count ?? 0`), making
        // "at least 0" a match-everything condition, which is why the validator
        // rejects a countless event. So omitting `count` compiles to an explicit
        // "at least 1" ("the event has happened"), the intuitive default.
        ...(c.count
          ? {
              countLogic: COUNT_LOGIC[c.count.op] ?? 'atLeast',
              count: c.count.n,
              ...(c.count.n2 !== undefined ? { count2: c.count.n2 } : {}),
            }
          : { countLogic: 'atLeast', count: 1 }),
        // `within` is optional in the representation, but the runtime/validator
        // treat a MISSING timeLogic as "needs a time window" (only
        // atAnyPointInTime is exempt) — so omitting `within` must compile to an
        // explicit atAnyPointInTime ("ever / no time limit"), not to nothing, or
        // an otherwise-valid event condition fails validation.
        ...(c.within
          ? {
              timeLogic: TIME_LOGIC[c.within.op] ?? 'atAnyPointInTime',
              ...(c.within.value !== undefined ? { windowValue: c.within.value } : {}),
              ...(c.within.value2 !== undefined ? { windowValue2: c.within.value2 } : {}),
              ...(c.within.unit ? { timeUnit: c.within.unit } : {}),
            }
          : { timeLogic: 'atAnyPointInTime' }),
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
      throw new ValidationError(
        `Cannot write a "${(c as { type: string }).type}" condition — this condition type is not supported via the API.`,
      );
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
    case 'start_content':
      return rule('flow-start', { contentId: a.content, ...(a.step ? { stepCvid: a.step } : {}) });
    case 'navigate':
      // The URL is stored as a Slate rich-text `value` (the builder + runtime read
      // `data.value` and serialize it — this is what lets `{{ attribute }}` work in
      // URLs), NOT a plain `url` string. compilePlainText turns the url into that node
      // shape WITHOUT markdown parsing (so a `*`/`_`/`[` in the URL stays literal);
      // decompile reads it back via decompileText(d.value).
      return rule('page-navigate', {
        value: compilePlainText(a.url),
        ...(a.newTab ? { openType: 'new', openNewTab: true } : { openType: 'same' }),
        ...(a.newWindow ? { openNewWindow: true } : {}),
      });
    case 'dismiss':
      return rule(dismiss, {});
    case 'run_javascript':
      throw new ValidationError(
        'Cannot write a run_javascript action via the API — it is blocked for security. Remove it, or edit this content in the builder.',
      );
    default:
      throw new ValidationError(
        `Cannot write a "${(a as { type: string }).type}" action — this action type is not supported via the API.`,
      );
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
    // `multiple` / `unlimited` need an `every` window present (a bare `{ mode }` crashes
    // the builder picker and breaks SDK frequency evaluation). Default it from
    // DEFAULT_FREQUENCY, merging any caller-provided fields. But only `multiple` reads
    // `every.times` (the count cap); `unlimited` uses only the window, so synthesizing a
    // `times` for it would echo a meaningless cap — drop it from the default there (an
    // explicitly-passed value is still respected). `once` uses no `every`; `atLeast` is
    // optional, so neither is synthesized.
    const mode = start.frequency.mode;
    const needsEvery = mode === 'multiple' || mode === 'unlimited';
    const everyDefault =
      mode === 'unlimited'
        ? { duration: DEFAULT_FREQUENCY.every.duration, unit: DEFAULT_FREQUENCY.every.unit }
        : DEFAULT_FREQUENCY.every;
    setting.frequency = {
      frequency: mode,
      ...(start.frequency.every || needsEvery
        ? { every: { ...everyDefault, ...(start.frequency.every ?? {}) } }
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
