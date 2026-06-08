// Shared WidthControls component for content editor elements

import { CompactSelect, type SelectPopoverOption, Input, Label } from '@usertour/ui';
import { EDITOR_SELECT } from '@usertour/constants';
import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { WIDTH_TYPES } from '../constants';
import type { DimensionConfig } from '../types/width';
import { sanitizeNumericInput } from '../utils/dimension';

const MAX_PERCENT_VALUE = 100;

export interface WidthControlsProps {
  label?: string;
  value: DimensionConfig;
  options: SelectPopoverOption[];
  onTypeChange: (type: string) => void;
  onValueChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  zIndex: number;
  showValueInput?: boolean;
  inputPlaceholder?: string;
  inputClassName?: string;
  comboBoxClassName?: string;
}

export const WidthControls = memo(
  ({
    label,
    value,
    options,
    onTypeChange,
    onValueChange,
    zIndex,
    showValueInput = true,
    inputPlaceholder,
    inputClassName = 'grow',
    comboBoxClassName = 'flex-none w-20 bg-surface-raised',
  }: WidthControlsProps) => {
    const id = useId();
    const widthInputId = `${id}-width-input`;
    const { t } = useTranslation();

    // SelectPopover-shaped options carry `name`; CompactSelect wants `label`.
    const typeOptions = useMemo(
      () => options.map((option) => ({ value: option.value, label: option.name })),
      [options],
    );

    // Local state for display value to allow typing any characters
    const [displayValue, setDisplayValue] = useState<string>(value.value?.toString() ?? '');

    // Sync display value when prop value changes from parent
    useEffect(() => {
      const propValue = value.value?.toString() ?? '';
      setDisplayValue(propValue);
    }, [value.value]);

    const handleTypeChange = useCallback(
      (type: string) => {
        onTypeChange(type);
      },
      [onTypeChange],
    );

    // Clamp value to max 100 for percent type
    const clampValue = useCallback(
      (val: string): string => {
        if (!val) return val;
        const num = Number(val);
        if (value.type === WIDTH_TYPES.PERCENT && num > MAX_PERCENT_VALUE) {
          return String(MAX_PERCENT_VALUE);
        }
        return val;
      },
      [value.type],
    );

    const handleValueChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        // Update local display value immediately
        setDisplayValue(inputValue);

        // Only notify parent if value is a valid number
        const sanitized = sanitizeNumericInput(inputValue);
        if (sanitized && !Number.isNaN(Number(sanitized))) {
          const clampedValue = clampValue(sanitized);
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: clampedValue },
          } as React.ChangeEvent<HTMLInputElement>;
          onValueChange(syntheticEvent);
        }
      },
      [onValueChange, clampValue],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const sanitizedValue = sanitizeNumericInput(inputValue);
        const clampedValue = clampValue(sanitizedValue);

        // Update display to clamped value
        setDisplayValue(clampedValue);

        // Notify parent with clamped value
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: clampedValue },
        } as React.ChangeEvent<HTMLInputElement>;
        onValueChange(syntheticEvent);
      },
      [onValueChange, clampValue],
    );

    return (
      <>
        <Label htmlFor={widthInputId}>{label ?? t('contentBuilder.editor.width.label')}</Label>
        <div className="flex gap-x-2">
          {showValueInput && (
            <Input
              variant="compact-muted"
              id={widthInputId}
              type="text"
              inputMode="numeric"
              value={displayValue}
              placeholder={inputPlaceholder ?? t('contentBuilder.editor.width.label')}
              onChange={handleValueChange}
              onBlur={handleBlur}
              className={inputClassName}
            />
          )}
          <CompactSelect
            options={typeOptions}
            value={value.type}
            onChange={handleTypeChange}
            placeholder={t('contentBuilder.editor.width.selectType')}
            className={comboBoxClassName}
            contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
          />
        </div>
      </>
    );
  },
);

WidthControls.displayName = 'WidthControls';
