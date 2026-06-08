import { useId } from 'react';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import { QuestionTooltip } from '../../primitives/tooltip';

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  tooltip?: string;
  error?: string;
  disabled?: boolean;
}

// A text row: label (+ optional `?` tooltip) above a compact text input, with an
// optional inline validation error. Controlled (value/onChange) and
// i18n-agnostic — the caller passes an already-translated label/placeholder.
// Mirrors SelectField / NumberField's label-above-control shape.
export const TextField = (props: TextFieldProps) => {
  const { label, value, onChange, placeholder, tooltip, error, disabled } = props;
  const id = useId();
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-1">
        <Label htmlFor={id}>{label}</Label>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </div>
      <Input
        variant="compact-muted"
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
};
TextField.displayName = 'TextField';
