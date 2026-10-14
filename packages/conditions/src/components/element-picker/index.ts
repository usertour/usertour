export {
  ElementPickerProvider,
  useElementPicker,
} from './element-picker-context';
export type {
  PickElementFunction,
  PickElementOptions,
  PickElementResult,
} from './element-picker-context';
export { PickElementButton } from './pick-element-button';
export type { PickElementButtonProps } from './pick-element-button';

// Form controls eligible for text-input / text-fill picking — passed as
// `mustMatch` so the picker only lets the user select editable elements.
export const FORM_CONTROL_PICK_TARGETS = 'input, textarea, select, [contenteditable]';
