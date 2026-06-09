import { Button, Input, QuestionTooltip } from '@usertour/ui';
import type { ElementSelectorPropsData } from '@usertour/types';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';
import { useConditionsT } from '../conditions-context';
import { ConditionSelect } from '../ui/condition-select';

export interface ConditionElementSelectorProps {
  data: ElementSelectorPropsData;
  onDataChange: (data: ElementSelectorPropsData) => void;
}

// Manual element-selection editor reskinned for the v2 conditions chrome.
// Mirrors the v1 ElementSelector contract (data + onDataChange) so it can
// drop into element / text-input / text-fill condition editors. Auto-mode
// preview lives in the chip Summary; the editor stays manual-only to match
// v1 behavior. The wrapper sets `type: 'manual'` on every patch so any
// pre-existing auto data converts on first edit.
export function ConditionElementSelector({ data, onDataChange }: ConditionElementSelectorProps) {
  const t = useConditionsT();
  const [innerData, setInnerData] = useState<ElementSelectorPropsData>(data);

  const update = useCallback(
    (patch: Partial<ElementSelectorPropsData>) => {
      const next: ElementSelectorPropsData = {
        precision: 'loose',
        sequence: '1st',
        ...innerData,
        ...patch,
        type: 'manual',
      };
      setInnerData(next);
      onDataChange(next);
    },
    [innerData, onDataChange],
  );

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) =>
    update({ content: e.target.value });
  const handleSelectorChange = (e: ChangeEvent<HTMLInputElement>) =>
    update({ customSelector: e.target.value });
  const handleSequenceChange = (value: string) => update({ sequence: value });

  const sequenceOptions = useMemo(
    () => [
      { value: '1st', label: t('conditions.types.element.selector.select1st') },
      { value: '2st', label: t('conditions.types.element.selector.select2nd') },
      { value: '3st', label: t('conditions.types.element.selector.select3rd') },
      { value: '4st', label: t('conditions.types.element.selector.select4th') },
      { value: '5st', label: t('conditions.types.element.selector.select5th') },
    ],
    [t],
  );

  const placeholder = t('conditions.types.element.selector.none');

  return (
    <div className="flex flex-col gap-2">
      <Field
        label={t('conditions.types.element.selector.elementText')}
        tooltip={t('conditions.types.element.selector.elementTextTooltip')}
      >
        <Input
          variant="compact-surface"
          value={innerData.content || ''}
          onChange={handleTextChange}
          placeholder={placeholder}
        />
      </Field>

      <Field
        label={t('conditions.types.element.selector.cssSelector')}
        tooltip={t('conditions.types.element.selector.cssSelectorTooltip')}
      >
        <Input
          variant="compact-surface"
          value={innerData.customSelector || ''}
          onChange={handleSelectorChange}
          placeholder={placeholder}
        />
      </Field>

      {innerData.selectorsList && innerData.selectorsList.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1">
          {innerData.selectorsList.map((item, i) => (
            <Button
              key={`${item}-${i}`}
              type="button"
              variant="secondary"
              size="compact-sm"
              onClick={() => update({ customSelector: item })}
            >
              {item}
            </Button>
          ))}
        </div>
      )}

      <Field
        label={t('conditions.types.element.selector.ifMultipleMatches')}
        tooltip={t('conditions.types.element.selector.ifMultipleMatchesTooltip')}
      >
        <ConditionSelect
          value={innerData.sequence ?? '1st'}
          onChange={handleSequenceChange}
          options={sequenceOptions}
          // Sits inside the browser-extension overlay's z-index space — keep
          // the dropdown above other extension chrome.
          className="w-full"
        />
      </Field>
    </div>
  );
}

interface FieldProps {
  label: string;
  tooltip: string;
  children: React.ReactNode;
}

function Field({ label, tooltip, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
        <span>{label}</span>
        <QuestionTooltip>{tooltip}</QuestionTooltip>
      </div>
      {children}
    </div>
  );
}
