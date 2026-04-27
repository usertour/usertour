import { useId } from 'react';
import { BuilderFontPicker } from '../ui';

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
}

// Vertical layout: font picker needs full sidebar width to show family names
// in the dropdown comfortably.
export function FontFamilyField({ value, onChange, label }: Props) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium leading-none">
        {label}
      </label>
      <BuilderFontPicker id={id} value={value ?? ''} onChange={onChange} />
    </div>
  );
}
