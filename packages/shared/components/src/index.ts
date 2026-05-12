export { Conditions } from './components/conditions';
export { DEFAULT_CONDITION_TYPES } from './components/conditions/registry';
export {
  ConditionFrequency,
  ConditionIfCompleted,
  ConditionPriority,
  ConditionWait,
} from './components/conditions/standalone';
export {
  validateConditions,
  validateConditionList,
  type ConditionValidationFailure,
} from './components/conditions/validate';
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
} from './components/conditions/validators';
export type {
  ConditionTypeSchema,
  AnySchema,
  ValidationError,
  ValidateContext,
} from './components/conditions/schema-types';
export type { ConditionsTranslator } from './components/conditions/conditions-context';
export { GoogleFontCss } from './components/theme/google-font';
export { SelectorDialog } from './components/selector/selector-dialog';
// Generic composition UI primitives live in @usertour-packages/ui —
// import them from there directly. Examples: SelectPopover, DateTimePicker,
// ErrorTooltip, ScaledPreviewContainer, LoadingContainer, LocateSelect.
// ColorPicker still lives here — `ColorPickerPanel` pulls in
// `useCurrentUserId` from `@usertour-packages/shared-hooks` to scope
// "recent colors" storage per user, which would force `@usertour-packages/ui`
// to depend on shared-hooks (Apollo). Pending a follow-up refactor that
// promotes userId to a prop so the panel becomes truly generic UI.
export { ColorPicker, ColorPickerPanel } from './components/color-picker';
export type { ColorPickerProps, ColorPickerPanelProps } from './components/color-picker';
