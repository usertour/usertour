import { CompactSelect, Label, QuestionTooltip } from '@usertour/ui';

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  tooltip?: string;
  placeholder?: string;
  // z-index for the popover content — pass the builder's popover layer when the
  // field renders inside a dialog/popover stack.
  zIndex?: number;
}

// A select row: label (+ optional `?` tooltip) above a full-width compact
// select. White trigger so it reads on top of a SettingsCard's slate card.
// i18n-agnostic — the caller passes already-translated label/options.
export const SelectField = (props: SelectFieldProps) => {
  const { label, value, onChange, options, tooltip, placeholder, zIndex } = props;
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-1">
        <Label>{label}</Label>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </div>
      <CompactSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-background-900 shadow-none"
        contentStyle={zIndex ? { zIndex } : undefined}
      />
    </div>
  );
};
SelectField.displayName = 'SelectField';
