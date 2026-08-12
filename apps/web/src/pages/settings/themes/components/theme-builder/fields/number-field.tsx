import { useId, useState } from 'react';
import { useBuilderContext } from '../builder-context';
import { ErrorTooltip, ErrorTooltipAnchor, ErrorTooltipContent, Input } from '@usertour/ui';
import { FieldRow } from './field-row';

export interface NumberFieldProps {
  path: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  // When true, an empty input clears the field (writes `undefined`). Used for
  // optional fields like z-index / launcher button width.
  optional?: boolean;
  placeholder?: string;
  // Pre-translated range explanation, shown in an ErrorTooltip while the stored
  // value is out of [min, max]. The value still writes live (so the preview
  // tracks typing); blur snaps it into range.
  rangeMessage?: string;
  tooltip?: string;
}

export const NumberField = (props: NumberFieldProps) => {
  const {
    path,
    label,
    min,
    max,
    step = 1,
    suffix,
    optional,
    placeholder,
    rangeMessage,
    tooltip,
  } = props;
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const stored = getField<number>(path);
  // While the field is focused, the input shows exactly what the user typed
  // (`draft`); the store — and therefore the preview — only ever receives the
  // CLAMPED value, so the preview always renders a state that can actually be
  // saved. Blur drops the draft, re-syncing the display to the store.
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (v: number) =>
    Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, v));

  const shown = draft ?? stored ?? '';
  // The tooltip reacts to what the user SEES (draft while typing, stored
  // otherwise — legacy themes can hold pre-range values).
  const shownNum = draft !== null ? Number.parseFloat(draft) : stored;
  const outOfRange =
    typeof shownNum === 'number' &&
    !Number.isNaN(shownNum) &&
    ((min !== undefined && shownNum < min) || (max !== undefined && shownNum > max));

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw === '') {
      if (optional) setField(path, undefined);
      return;
    }
    const next = Number.parseFloat(raw);
    if (Number.isNaN(next)) return;
    setField(path, clamp(next));
  };

  const handleBlur = () => {
    setDraft(null);
    // Stored values can predate the ranges (legacy themes); editing the field
    // settles them into range.
    if (typeof stored === 'number' && clamp(stored) !== stored) setField(path, clamp(stored));
  };

  return (
    <FieldRow label={label} htmlFor={id} tooltip={tooltip}>
      <ErrorTooltip open={outOfRange && !!rangeMessage}>
        <ErrorTooltipAnchor asChild>
          <div className="relative">
            <Input
              variant="compact-muted"
              id={id}
              type="number"
              value={shown}
              min={min}
              max={max}
              step={step}
              placeholder={placeholder}
              disabled={isReadOnly}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              className={suffix ? 'pr-8' : undefined}
            />
            {suffix && (
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
                {suffix}
              </span>
            )}
          </div>
        </ErrorTooltipAnchor>
        <ErrorTooltipContent
          side="right"
          align="center"
          // The tooltip opens mid-typing; grabbing focus would cut the user off.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {rangeMessage}
        </ErrorTooltipContent>
      </ErrorTooltip>
    </FieldRow>
  );
};
