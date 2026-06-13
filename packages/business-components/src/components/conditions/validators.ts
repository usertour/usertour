// Condition validators now live in @usertour/helpers — a single source of truth
// shared by this builder UI and the server's write-path validator (v2 REST /
// MCP), so the rules can't drift between the two surfaces. Re-exported here so
// existing builder imports keep resolving unchanged.
export {
  validateUserAttr,
  validateCurrentPage,
  validateSegment,
  validateContent,
  validateElement,
  validateTextInput,
  validateTextFill,
  validateTime,
  validateEvent,
  validateEventAttr,
  validateConditionByType,
  type UserAttrShape,
  type CurrentPageShape,
  type SegmentShape,
  type ContentShape,
  type ElementShape,
  type TextInputShape,
  type EventShape,
  type EventAttrShape,
} from '@usertour/helpers';
