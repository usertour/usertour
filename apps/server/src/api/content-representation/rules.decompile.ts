import {
  CompilableCondition,
  EventWhereCondition,
  RepresentationAction,
  RepresentationCondition,
  RepresentationHideRules,
  RepresentationStartRules,
  RepresentationTrigger,
  StringOp,
} from './representation.schema';
import { LOGIC_TO_ATTR_OP } from './attr-ops';
import { decompileText } from './text.decompile';
import { decompileTarget } from './target.decompile';

/**
 * Resolves internal ids to the stable codes the representation schema references
 * (attribute / event by codeName). The service builds these from the project's
 * attribute + event definitions; unknown ids fall back to the raw id.
 */
export interface DecompileResolvers {
  attributeCode: (id: string) => string;
  eventCode: (id: string) => string;
}

export const IDENTITY_RESOLVERS: DecompileResolvers = {
  attributeCode: (id) => id,
  eventCode: (id) => id,
};

type RuleNode = {
  id?: string;
  type?: string;
  data?: any;
  operators?: string;
  conditions?: RuleNode[];
};

// Internal logic strings → representation ops.
const STRING_OP: Record<string, StringOp> = {
  is: 'is',
  not: 'not',
  contains: 'contains',
  notContain: 'not_contains',
  startsWith: 'starts_with',
  endsWith: 'ends_with',
  match: 'match',
  unmatch: 'unmatch',
  any: 'any',
  empty: 'empty',
};
// internal logic → representation op — single source of truth in attr-ops.ts.
const ATTR_OP: Record<string, string> = LOGIC_TO_ATTR_OP;
const ELEMENT_STATE: Record<string, string> = {
  present: 'present',
  unpresent: 'hidden',
  disabled: 'disabled',
  undisabled: 'enabled',
  clicked: 'clicked',
  unclicked: 'unclicked',
};
const CONTENT_STATE: Record<string, string> = {
  seen: 'seen',
  unseen: 'unseen',
  completed: 'completed',
  uncompleted: 'uncompleted',
  actived: 'active',
  unactived: 'inactive',
};
const COUNT_OP: Record<string, string> = {
  atLeast: 'at_least',
  atMost: 'at_most',
  exactly: 'exactly',
  between: 'between',
};
const TIME_OP: Record<string, string> = {
  inTheLast: 'in_the_last',
  moreThan: 'more_than',
  between: 'between',
  atAnyPointInTime: 'any_time',
};
const SCOPE: Record<string, string> = {
  byCurrentUserInAnyCompany: 'current_user',
  byCurrentUserInCurrentCompany: 'current_user_in_company',
  byAnyUserInCurrentCompany: 'any_user_in_company',
};

const mapStringOp = (logic: unknown): StringOp =>
  (typeof logic === 'string' && STRING_OP[logic]) || 'is';
const mapAttrOp = (logic: unknown): string =>
  (typeof logic === 'string' && (ATTR_OP[logic] ?? logic)) || 'is';

// ── Conditions ───────────────────────────────────────────────────────────────

export function decompileConditions(
  raw: unknown,
  r: DecompileResolvers,
): RepresentationCondition[] {
  // General slots only ever hold general conditions; the context-restricted
  // event_attribute / task_clicked appear solely inside event.where / checklist
  // completeWhen, which carry their own narrower types at the boundary.
  return (Array.isArray(raw) ? raw : []).map((c) =>
    decompileCondition(c, r),
  ) as RepresentationCondition[];
}

/** The and/or of a flat list lives on its first node's `operators` (the runtime
 * reads `list[0].operators`); a missing/`and` value means AND. */
const listJoiner = (raw: unknown): 'and' | 'or' =>
  Array.isArray(raw) && (raw[0] as RuleNode | undefined)?.operators === 'or' ? 'or' : 'and';

/**
 * Decompile a top-level `when` list. The representation has no field for a flat
 * list's and/or — a bare `when` array is AND by convention — so an OR list is
 * wrapped in a single `group{match:'any'}`, the same way OR is expressed at any
 * other level. (A single condition needs no wrapper: and/or is moot.) This is
 * the inverse of compileConditions stamping the joiner back onto each node.
 */
export function decompileWhen(raw: unknown, r: DecompileResolvers): RepresentationCondition[] {
  const items = decompileConditions(raw, r);
  if (items.length <= 1 || listJoiner(raw) !== 'or') return items;
  return [{ type: 'group', match: 'any', conditions: items }];
}

export function decompileCondition(c: RuleNode, r: DecompileResolvers): CompilableCondition {
  const d = c.data ?? {};
  switch (c.type) {
    case 'group':
      // A group's `match` is its INTERNAL and/or — stored on its children's
      // `operators` (the runtime reads `group.conditions[0].operators`), NOT on
      // the group node itself (that carries the parent list's joiner).
      return {
        type: 'group',
        match: listJoiner(c.conditions) === 'or' ? 'any' : 'all',
        conditions: decompileConditions(c.conditions, r),
      };
    case 'user-attr':
      return {
        type: 'user_attribute',
        attribute: r.attributeCode(d.attrId ?? ''),
        op: mapAttrOp(d.logic),
        ...(d.value != null ? { value: String(d.value) } : {}),
        ...(d.value2 != null ? { value2: String(d.value2) } : {}),
        ...(Array.isArray(d.listValues) ? { values: d.listValues } : {}),
      };
    case 'event-attr':
      // attrId → code via the shared attributeCode map (ids are unique, so no
      // bizType ambiguity on the read side).
      return {
        type: 'event_attribute',
        attribute: r.attributeCode(d.attrId ?? ''),
        op: mapAttrOp(d.logic),
        ...(d.value != null ? { value: String(d.value) } : {}),
        ...(d.value2 != null ? { value2: String(d.value2) } : {}),
        ...(Array.isArray(d.listValues) ? { values: d.listValues } : {}),
      };
    case 'task-is-clicked':
      return { type: 'task_clicked' };
    case 'segment':
      return { type: 'segment', segment: d.segmentId ?? '', in: (d.logic ?? 'is') !== 'not' };
    case 'current-page':
      return {
        type: 'current_url',
        includes: Array.isArray(d.includes) ? d.includes : [],
        ...(Array.isArray(d.excludes) && d.excludes.length ? { excludes: d.excludes } : {}),
      };
    case 'element': {
      const target = decompileTarget(d.elementData);
      return {
        type: 'element',
        ...(target ? { target } : {}),
        state: (ELEMENT_STATE[d.logic] ?? 'present') as never,
      };
    }
    case 'content':
      return {
        type: 'flow',
        flow: d.contentId ?? '',
        state: (CONTENT_STATE[d.logic] ?? 'seen') as never,
      };
    case 'event':
      return {
        type: 'event',
        event: r.eventCode(d.eventId ?? ''),
        ...mapCount(d),
        ...mapWithin(d),
        ...(SCOPE[d.scope] ? { scope: SCOPE[d.scope] as never } : {}),
        ...(Array.isArray(d.whereConditions) && d.whereConditions.length
          ? { where: decompileWhen(d.whereConditions, r) as unknown as EventWhereCondition[] }
          : {}),
      };
    case 'text-input': {
      const target = decompileTarget(d.elementData);
      return {
        type: 'text_input',
        ...(target ? { target } : {}),
        op: mapStringOp(d.logic),
        ...(d.value != null ? { value: String(d.value) } : {}),
      };
    }
    case 'text-fill': {
      const target = decompileTarget(d.elementData);
      return { type: 'text_filled', ...(target ? { target } : {}) };
    }
    case 'time':
      return mapTime(d);
    default:
      return { type: 'unsupported', ...(c.type ? { note: c.type } : {}) };
  }
}

function mapCount(
  d: any,
): Partial<Pick<Extract<RepresentationCondition, { type: 'event' }>, 'count'>> {
  if (typeof d.countLogic !== 'string') {
    return {};
  }
  return {
    count: {
      op: (COUNT_OP[d.countLogic] ?? 'at_least') as never,
      n: typeof d.count === 'number' ? d.count : 0,
      ...(typeof d.count2 === 'number' ? { n2: d.count2 } : {}),
    },
  };
}

function mapWithin(
  d: any,
): Partial<Pick<Extract<RepresentationCondition, { type: 'event' }>, 'within'>> {
  if (typeof d.timeLogic !== 'string') {
    return {};
  }
  return {
    within: {
      op: (TIME_OP[d.timeLogic] ?? 'any_time') as never,
      ...(typeof d.windowValue === 'number' ? { value: d.windowValue } : {}),
      ...(typeof d.windowValue2 === 'number' ? { value2: d.windowValue2 } : {}),
      ...(typeof d.timeUnit === 'string' ? { unit: d.timeUnit as never } : {}),
    },
  };
}

function mapTime(d: any): RepresentationCondition {
  if (typeof d.startTime === 'string' || typeof d.endTime === 'string') {
    return {
      type: 'time_window',
      ...(typeof d.startTime === 'string' ? { start: d.startTime } : {}),
      ...(typeof d.endTime === 'string' ? { end: d.endTime } : {}),
    };
  }
  // legacy MM/dd/yyyy component format → not modeled
  return { type: 'unsupported', note: 'time:legacy' };
}

// ── Actions ──────────────────────────────────────────────────────────────────

export function decompileActions(raw: unknown): RepresentationAction[] {
  return (Array.isArray(raw) ? raw : []).map(decompileAction);
}

export function decompileAction(a: RuleNode): RepresentationAction {
  const d = a.data ?? {};
  switch (a.type) {
    case 'step-goto':
      return { type: 'goto_step', step: d.stepCvid ?? '' };
    case 'flow-start':
      return {
        type: 'start_flow',
        flow: d.contentId ?? '',
        ...(d.stepCvid ? { step: d.stepCvid } : {}),
      };
    case 'page-navigate':
      return {
        type: 'navigate',
        url: typeof d.url === 'string' ? d.url : decompileText(d.value),
        ...(d.openType === 'new' || d.openNewTab ? { newTab: true } : {}),
        ...(d.openNewWindow ? { newWindow: true } : {}),
      };
    case 'javascript-evaluate':
      return { type: 'run_javascript', script: typeof d.value === 'string' ? d.value : '' };
    case 'flow-dismis':
    case 'launcher-dismis':
    case 'checklist-dismis':
    case 'banner-dismis':
      return { type: 'dismiss' };
    default:
      return { type: 'unsupported', ...(a.type ? { note: a.type } : {}) };
  }
}

// ── Triggers ─────────────────────────────────────────────────────────────────

export function decompileTriggers(raw: unknown, r: DecompileResolvers): RepresentationTrigger[] {
  return (Array.isArray(raw) ? raw : []).map((t) => decompileTrigger(t, r));
}

function decompileTrigger(t: any, r: DecompileResolvers): RepresentationTrigger {
  return {
    ...(Array.isArray(t?.conditions) && t.conditions.length
      ? { when: decompileWhen(t.conditions, r) }
      : {}),
    do: decompileActions(t?.actions),
    ...(typeof t?.wait === 'number' ? { waitMs: t.wait } : {}),
  };
}

// ── Version-level start / hide rules (from Version.config) ───────────────────

export function decompileStartRules(
  config: any,
  r: DecompileResolvers,
): RepresentationStartRules | undefined {
  if (!config?.enabledAutoStartRules) {
    return undefined;
  }
  const setting = config.autoStartRulesSetting ?? {};
  return {
    when: decompileWhen(config.autoStartRules, r),
    ...(setting.frequency ? { frequency: mapFrequency(setting.frequency) } : {}),
    ...(setting.priority ? { priority: setting.priority } : {}),
    ...(typeof setting.wait === 'number' ? { waitMs: setting.wait } : {}),
    ...(typeof setting.startIfNotComplete === 'boolean'
      ? { startIfNotComplete: setting.startIfNotComplete }
      : {}),
  };
}

export function decompileHideRules(
  config: any,
  r: DecompileResolvers,
): RepresentationHideRules | undefined {
  if (!config?.enabledHideRules) {
    return undefined;
  }
  return { when: decompileWhen(config.hideRules, r) };
}

function mapFrequency(f: any): RepresentationStartRules['frequency'] {
  return {
    mode: f.frequency ?? 'unlimited',
    ...(f.every
      ? {
          every: {
            ...(typeof f.every.times === 'number' ? { times: f.every.times } : {}),
            duration: f.every.duration,
            unit: f.every.unit,
          },
        }
      : {}),
    ...(f.atLeast ? { atLeast: { duration: f.atLeast.duration, unit: f.atLeast.unit } } : {}),
  };
}
