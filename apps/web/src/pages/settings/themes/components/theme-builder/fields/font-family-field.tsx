import { QuestionTooltip } from '@usertour/tooltip';
import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { BuilderFontPicker } from '../ui';

export interface FontFamilyFieldProps {
  path: string;
  label: string;
  tooltip?: string;
}

// Vertical layout: font picker needs full sidebar width to show family names
// in the dropdown comfortably.
export const FontFamilyField = (props: FontFamilyFieldProps) => {
  const { path, label, tooltip } = props;
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
};
