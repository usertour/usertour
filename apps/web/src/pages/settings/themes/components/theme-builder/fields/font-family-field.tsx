import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { BuilderFontPicker } from '../ui';

interface Props {
  path: string;
  label: string;
}

// Vertical layout: font picker needs full sidebar width to show family names
// in the dropdown comfortably.
export function FontFamilyField({ path, label }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<string>(path) ?? '';
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium leading-none">
        {label}
      </label>
      <BuilderFontPicker
        id={id}
        value={value}
        disabled={isReadOnly}
        onChange={(next) => setField(path, next)}
      />
    </div>
  );
}
