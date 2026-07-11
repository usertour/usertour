import {
  AttributeBizTypes,
  AttributeDataType,
  type Attribute,
  type Content,
  type Event,
  EventCountLogic,
  EventTimeLogic,
  type RulesCondition,
  type Segment,
  type TimeConditionData,
} from '@usertour/types';
import { isEmptyString, isNullish } from '../type-utils';
import { VALUELESS_OPERATORS, operatorsFor } from './operator-mappings';

// Single source of truth for condition validation, shared by the builder UI and
// the server's write-path validator (v2 REST / MCP). Pure — no React, no DOM —
// so it imports cleanly from either side. Returning a translation key marks the
// condition invalid; returning undefined means valid.

// Validation context — cross-checks a condition against the live attribute /
// segment / content / event lists for the project.
export interface ValidateContext {
  attributes?: Attribute[];
  segments?: Segment[];
  contents?: Content[];
  events?: Event[];
}

export interface ValidationError {
  key: string;
  values?: Record<string, unknown>;
}

// ---------- Pure data shapes (mirrors what the editors store under data) ----------

export interface UserAttrShape {
  attrId?: string;
  logic?: string;
  value?: string;
  value2?: string;
  listValues?: string[];
}

export interface CurrentPageShape {
  includes?: string[];
  excludes?: string[];
}

export interface SegmentShape {
  segmentId?: string;
  logic?: string;
}

export interface ContentShape {
  contentId?: string;
  logic?: string;
}

export interface ElementShape {
  elementData?: {
    type?: string;
    content?: string;
    customSelector?: string;
    screenshot?: string;
    selectors?: unknown;
  };
  logic?: string;
}

export interface TextInputShape extends ElementShape {
  value?: string;
}

export interface EventShape {
  eventId?: string;
  countLogic?: string;
  count?: number;
  count2?: number;
  timeLogic?: string;
  windowValue?: number;
  windowValue2?: number;
  timeUnit?: string;
}

// eventId is no longer persisted on event-attr's data — it flows down via
// EventScopeContext from the parent event editor. Event-attrs are
// structurally only valid inside an event's where section, so the parent
// scope is always derivable from the React tree at edit time.
export type EventAttrShape = UserAttrShape;

// ---------- Helpers ----------

// Mirrors v1 helpers/error.ts `isValidSelector` and the runtime contract in
// finder finderV2 — auto needs the captured selectors tree to query
// against, manual needs an actual CSS customSelector. content alone is just
// label text and the runtime ignores it without a selector to anchor on.
const isElementSelected = (data: ElementShape['elementData']): boolean => {
  if (!data) return false;
  if (data.type === 'auto') return Boolean(data.selectors);
  if (data.type === 'manual') return Boolean(data.customSelector);
  return false;
};

const cleanList = (values: string[] | undefined): string[] =>
  (values ?? []).map((v) => v.trim()).filter((v) => v !== '');

// An operator (logic) must be one the attribute's datatype actually supports.
// The builder UI constrains this via the operator dropdown; the server has no
// such gate, so the check is the guarantee there. `undefined` datatype falls
// back to the String operator set (operatorsFor's own default).
const isOperatorValidForType = (logic: string, dataType: number | undefined): boolean =>
  operatorsFor(dataType).some((o) => o.value === logic);

/**
 * Whether a condition value counts as "not filled in". A plain `!value` falsy
 * check is wrong here: the number 0 (or the string "0") is a REAL value, but
 * `!0` is true — so a stored numeric 0 (which the untyped web GraphQL write
 * path or a data import can persist even though the value is typed `string`)
 * would be flagged as missing and, since this validator now backs the server
 * publish/dry-run gate, hard-refuse publishing an otherwise valid condition.
 * Missing = nullish or a blank/whitespace string; everything else is present.
 */
const isValueMissing = (value: unknown): boolean => isNullish(value) || isEmptyString(value);

// ---------- Per-type validators ----------

export function validateUserAttr(
  data: UserAttrShape | undefined,
  attributes: Attribute[] | undefined,
): ValidationError | undefined {
  if (!data?.attrId) return { key: 'conditions.errors.userAttr.selectAttribute' };
  const attribute = attributes?.find((a) => a.id === data.attrId);
  if (!attribute) return { key: 'conditions.errors.userAttr.selectAttribute' };
  if (!data.logic) return { key: 'conditions.errors.userAttr.selectOperator' };
  if (!isOperatorValidForType(data.logic, attribute.dataType)) {
    return { key: 'conditions.errors.userAttr.invalidOperator' };
  }
  if (VALUELESS_OPERATORS.has(data.logic)) return undefined;
  if (data.logic === 'between') {
    if (isValueMissing(data.value) || isValueMissing(data.value2))
      return { key: 'conditions.errors.userAttr.enterValue' };
    return undefined;
  }
  if (attribute.dataType === AttributeDataType.List) {
    if (!data.listValues || data.listValues.length === 0) {
      return { key: 'conditions.errors.userAttr.enterValue' };
    }
    return undefined;
  }
  if (isValueMissing(data.value)) return { key: 'conditions.errors.userAttr.enterValue' };
  return undefined;
}

export function validateCurrentPage(
  data: CurrentPageShape | undefined,
): ValidationError | undefined {
  if (cleanList(data?.includes).length === 0 && cleanList(data?.excludes).length === 0) {
    return { key: 'conditions.errors.currentPage.enterPattern' };
  }
  return undefined;
}

export function validateSegment(
  data: SegmentShape | undefined,
  segments: Segment[] | undefined,
): ValidationError | undefined {
  if (!data?.segmentId) return { key: 'conditions.errors.segment.selectSegment' };
  if (segments && !segments.find((s) => s.id === data.segmentId)) {
    return { key: 'conditions.errors.segment.selectSegment' };
  }
  return undefined;
}

export function validateContent(
  data: ContentShape | undefined,
  contents: Content[] | undefined,
): ValidationError | undefined {
  if (!data?.contentId) return { key: 'conditions.errors.content.selectContent' };
  if (contents && !contents.find((c) => c.id === data.contentId)) {
    return { key: 'conditions.errors.content.selectContent' };
  }
  return undefined;
}

export function validateElement(data: ElementShape | undefined): ValidationError | undefined {
  if (!isElementSelected(data?.elementData)) {
    return { key: 'conditions.errors.element.selectElement' };
  }
  return undefined;
}

export function validateTextInput(data: TextInputShape | undefined): ValidationError | undefined {
  if (!isElementSelected(data?.elementData)) {
    return { key: 'conditions.errors.element.selectElement' };
  }
  const logic = data?.logic ?? '';
  if (!['any', 'empty'].includes(logic) && isValueMissing(data?.value)) {
    return { key: 'conditions.errors.userAttr.enterValue' };
  }
  return undefined;
}

export function validateTextFill(data: ElementShape | undefined): ValidationError | undefined {
  return validateElement(data);
}

export function validateTime(data: TimeConditionData | undefined): ValidationError | undefined {
  // The SDK runtime (helpers/conditions/time.ts) returns false whenever a
  // start time is missing, so end-only data is functionally a never-match
  // condition and shouldn't be persisted. v1 RulesCurrentTime side-stepped
  // this by silently dropping end-only into {} on save; we surface it as a
  // proper validation error instead.
  if (!data) return { key: 'conditions.errors.time.enterStart' };
  const v2 = data as { startTime?: string };
  if (v2.startTime) return undefined;
  const legacy = data as { startDate?: string };
  if (legacy.startDate) return undefined;
  return { key: 'conditions.errors.time.enterStart' };
}

// Event count/window fields are numeric, so nullish (not blank-string) is the
// missing test — the shared `isNullish`. Treating null and undefined the same
// matters because backend payloads / imported JSON can land with explicit nulls,
// and the runtime evaluator coerces null counts to 0 (`data.count ?? 0`),
// turning AT_LEAST 0 into a match-all condition. (v1 getEventError did the same.)
const isMissing = isNullish;

export function validateEvent(
  data: EventShape | undefined,
  events?: Event[],
): ValidationError | undefined {
  if (!data?.eventId) return { key: 'conditions.errors.event.selectEvent' };
  // Existence check, like segment/content — a dangling eventId gates nothing at
  // runtime. Only enforced when the caller supplies the event list (server
  // publish/dry-run); skipped in contexts that don't load it.
  if (events && !events.find((e) => e.id === data.eventId)) {
    return { key: 'conditions.errors.event.selectEvent' };
  }
  if (isMissing(data.count)) return { key: 'conditions.errors.event.enterCount' };
  if (data.countLogic === EventCountLogic.BETWEEN && isMissing(data.count2)) {
    return { key: 'conditions.errors.event.enterSecondCount' };
  }
  if (data.timeLogic !== EventTimeLogic.AT_ANY_POINT_IN_TIME && isMissing(data.windowValue)) {
    return { key: 'conditions.errors.event.enterTimeWindow' };
  }
  if (data.timeLogic === EventTimeLogic.BETWEEN && isMissing(data.windowValue2)) {
    return { key: 'conditions.errors.event.enterSecondTimeWindow' };
  }
  // A windowed op needs a unit too — without it the runtime silently assumes
  // days (toMilliseconds default), so "7" could mean days when the author meant
  // hours. Enforce it (the builder always sets one; this only catches API/MCP
  // payloads). atAnyPointInTime needs no window and so no unit.
  if (data.timeLogic !== EventTimeLogic.AT_ANY_POINT_IN_TIME && isMissing(data.timeUnit)) {
    return { key: 'conditions.errors.event.selectTimeUnit' };
  }
  return undefined;
}

export function validateEventAttr(
  data: EventAttrShape | undefined,
  attributes: Attribute[] | undefined,
): ValidationError | undefined {
  if (!data?.attrId) return { key: 'conditions.errors.eventAttr.selectAttribute' };
  const attribute = attributes?.find(
    (a) => a.id === data.attrId && a.bizType === AttributeBizTypes.Event,
  );
  if (!attribute) return { key: 'conditions.errors.eventAttr.selectAttribute' };
  if (!data.logic) return { key: 'conditions.errors.userAttr.selectOperator' };
  if (!isOperatorValidForType(data.logic, attribute.dataType)) {
    return { key: 'conditions.errors.userAttr.invalidOperator' };
  }
  if (VALUELESS_OPERATORS.has(data.logic)) return undefined;
  if (data.logic === 'between') {
    if (isValueMissing(data.value) || isValueMissing(data.value2))
      return { key: 'conditions.errors.userAttr.enterValue' };
    return undefined;
  }
  if (isValueMissing(data.value) && (!data.listValues || data.listValues.length === 0)) {
    return { key: 'conditions.errors.userAttr.enterValue' };
  }
  return undefined;
}

// ---------- Dispatch helpers used both at runtime and in tests ----------

export function validateConditionByType(
  condition: RulesCondition,
  ctx: ValidateContext,
): ValidationError | undefined {
  switch (condition.type) {
    case 'user-attr':
      return validateUserAttr(condition.data as UserAttrShape, ctx.attributes);
    case 'current-page':
      return validateCurrentPage(condition.data as CurrentPageShape);
    case 'segment':
      return validateSegment(condition.data as SegmentShape, ctx.segments);
    case 'content':
      return validateContent(condition.data as ContentShape, ctx.contents);
    case 'element':
      return validateElement(condition.data as ElementShape);
    case 'text-input':
      return validateTextInput(condition.data as TextInputShape);
    case 'text-fill':
      return validateTextFill(condition.data as ElementShape);
    case 'time':
      return validateTime(condition.data as TimeConditionData);
    case 'event':
      return validateEvent(condition.data as EventShape, ctx.events);
    case 'event-attr':
      return validateEventAttr(condition.data as EventAttrShape, ctx.attributes);
    default:
      return undefined;
  }
}
