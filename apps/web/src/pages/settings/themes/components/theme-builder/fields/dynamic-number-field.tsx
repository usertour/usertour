import { NumberField } from './number-field';

export interface DynamicNumberFieldProps {
  // Both `label` and `path` are pre-resolved by FieldRenderer (which knows the
  // active settings + i18n function). The leaf component just renders.
  label: string;
  path: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  rangeMessage?: string;
  tooltip?: string;
}

// Same control as NumberField — the "dynamic" part (resolving path/label/bounds
// from the active settings) lives in FieldRenderer.
export const DynamicNumberField = (props: DynamicNumberFieldProps) => {
  return <NumberField {...props} />;
};
