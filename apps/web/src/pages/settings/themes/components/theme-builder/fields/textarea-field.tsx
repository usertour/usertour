import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { Textarea } from '@usertour/ui';
import { FieldRow } from './field-row';

export interface TextareaFieldProps {
  path: string;
  label: string;
  placeholder?: string;
  tooltip?: string;
  rows?: number;
}

// Multi-line raw-text field (monospace) — used for the theme's custom CSS,
// where the value is code rather than prose.
export const TextareaField = (props: TextareaFieldProps) => {
  const { path, label, placeholder, tooltip, rows = 8 } = props;
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<string>(path) ?? '';
  return (
    <FieldRow label={label} htmlFor={id} tooltip={tooltip} forceVertical>
      <Textarea
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={isReadOnly}
        rows={rows}
        spellCheck={false}
        className="font-mono text-sm"
        onChange={(e) => setField(path, e.target.value)}
      />
    </FieldRow>
  );
};
