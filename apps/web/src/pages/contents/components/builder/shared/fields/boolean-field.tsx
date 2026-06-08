import { Label, QuestionTooltip, Switch } from '@usertour/ui';
import { useId } from 'react';

export interface BooleanFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
  disabled?: boolean;
}

// A single switch row: label (+ optional `?` tooltip) on the left, switch on the
// right. Keeps the builder's bg-input unchecked track. i18n-agnostic — the
// caller passes already-translated label/tooltip.
export const BooleanField = (props: BooleanFieldProps) => {
  const { label, checked, onChange, tooltip, disabled } = props;
  const id = useId();
  return (
    <div className="flex items-center justify-between space-x-2">
      <Label htmlFor={id} className="flex flex-row items-center space-x-1 font-normal">
        <span>{label}</span>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </Label>
      <Switch
        id={id}
        className="data-[state=unchecked]:bg-input"
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
};
BooleanField.displayName = 'BooleanField';
