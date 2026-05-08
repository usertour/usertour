import { QuestionTooltip } from '@usertour-packages/tooltip';
import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { BuilderFontPicker } from '../ui';

interface Props {
  path: string;
  label: string;
  tooltip?: string;
}

// Vertical layout: font picker needs full sidebar width to show family names
// in the dropdown comfortably.
export function FontFamilyField({ path, label, tooltip }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<string>(path) ?? '';
  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1 text-sm font-medium leading-none">
        <label htmlFor={id}>{label}</label>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </span>
      <BuilderFontPicker
        id={id}
        value={value}
        disabled={isReadOnly}
        onChange={(next) => setField(path, next)}
      />
    </div>
  );
}
