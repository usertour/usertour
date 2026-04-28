import {
  AttributeBizTypes,
  AttributeDataType,
  type Attribute,
  type Content,
  EventCountLogic,
  EventTimeLogic,
  type RulesCondition,
  type Segment,
  type TimeConditionData,
} from '@usertour/types';
import type { ValidateContext, ValidationError } from './schema-types';

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
  type?: string;
  logic?: string;
}

export interface ElementShape {
  elementData?: {
    type?: string;
    content?: string;
    customSelector?: string;
    screenshot?: string;
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
}

export interface EventAttrShape extends UserAttrShape {
  eventId?: string;
}

// ---------- Helpers ----------

const VALUELESS_USER_ATTR_OPS = new Set(['any', 'empty', 'true', 'false']);

const isElementSelected = (data: ElementShape['elementData']): boolean => {
  if (!data) return false;
  if (data.type === 'auto') return Boolean(data.screenshot);
  if (data.type === 'manual') return Boolean(data.content || data.customSelector);
  return false;
};

const cleanList = (values: string[] | undefined): string[] =>
  (values ?? []).map((v) => v.trim()).filter((v) => v !== '');

// ---------- Per-type validators ----------

export function validateUserAttr(
  data: UserAttrShape | undefined,
  attributes: Attribute[] | undefined,
): ValidationError | undefined {
  if (!data?.attrId) return { key: 'conditions.errors.userAttr.selectAttribute' };
  const attribute = attributes?.find((a) => a.id === data.attrId);
  if (!attribute) return { key: 'conditions.errors.userAttr.selectAttribute' };
  if (!data.logic) return { key: 'conditions.errors.userAttr.selectOperator' };
  if (VALUELESS_USER_ATTR_OPS.has(data.logic)) return undefined;
  if (data.logic === 'between') {
    if (!data.value || !data.value2) return { key: 'conditions.errors.userAttr.enterValue' };
    return undefined;
  }
  if (attribute.dataType === AttributeDataType.List) {
    if (!data.listValues || data.listValues.length === 0) {
      return { key: 'conditions.errors.userAttr.enterValue' };
    }
    return undefined;
  }
  if (!data.value) return { key: 'conditions.errors.userAttr.enterValue' };
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
  if (!['any', 'empty'].includes(logic) && !data?.value) {
    return { key: 'conditions.errors.userAttr.enterValue' };
  }
  return undefined;
}

export function validateTextFill(data: ElementShape | undefined): ValidationError | undefined {
  return validateElement(data);
}

export function validateTime(data: TimeConditionData | undefined): ValidationError | undefined {
  if (!data) return { key: 'conditions.errors.time.enterRange' };
  const v2 = data as { startTime?: string; endTime?: string };
  if (v2.startTime || v2.endTime) return undefined;
  const legacy = data as { startDate?: string; endDate?: string };
  if (legacy.startDate || legacy.endDate) return undefined;
  return { key: 'conditions.errors.time.enterRange' };
}

export function validateEvent(data: EventShape | undefined): ValidationError | undefined {
  if (!data?.eventId) return { key: 'conditions.errors.event.selectEvent' };
  if (data.count === undefined) return { key: 'conditions.errors.event.enterCount' };
  if (data.countLogic === EventCountLogic.BETWEEN && data.count2 === undefined) {
    return { key: 'conditions.errors.event.enterSecondCount' };
  }
  if (data.timeLogic !== EventTimeLogic.AT_ANY_POINT_IN_TIME && data.windowValue === undefined) {
    return { key: 'conditions.errors.event.enterTimeWindow' };
  }
  if (data.timeLogic === EventTimeLogic.BETWEEN && data.windowValue2 === undefined) {
    return { key: 'conditions.errors.event.enterSecondTimeWindow' };
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
  if (VALUELESS_USER_ATTR_OPS.has(data.logic)) return undefined;
  if (data.logic === 'between') {
    if (!data.value || !data.value2) return { key: 'conditions.errors.userAttr.enterValue' };
    return undefined;
  }
  if (!data.value && (!data.listValues || data.listValues.length === 0)) {
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
      return validateEvent(condition.data as EventShape);
    case 'event-attr':
      return validateEventAttr(condition.data as EventAttrShape, ctx.attributes);
    default:
      return undefined;
  }
}
