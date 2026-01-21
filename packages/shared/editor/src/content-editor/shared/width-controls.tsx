// Shared WidthControls component for content editor elements

import type { ComboBoxOption } from '@usertour-packages/combo-box';
import { ComboBox } from '@usertour-packages/combo-box';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { memo, useCallback, useEffect, useId, useState } from 'react';

import { WIDTH_TYPES } from '../constants';
import type { DimensionConfig } from '../types/width';
import { sanitizeNumericInput } from '../utils/dimension';

const MAX_PERCENT_VALUE = 100;

export interface WidthControlsProps {
  label?: string;
  value: DimensionConfig;
  options: ComboBoxOption[];
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
    label = 'Width',
    value,
    options,
    onTypeChange,
    onValueChange,
    zIndex,
    showValueInput = true,
    inputPlaceholder = 'Width',
    inputClassName = 'bg-background grow',
    comboBoxClassName = 'flex-none w-20 h-auto px-2',
  }: WidthControlsProps) => {
    const id = useId();
    const widthInputId = `${id}-width-input`;

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
        <Label htmlFor={widthInputId}>{label}</Label>
        <div className="flex gap-x-2">
          {showValueInput && (
            <Input
              id={widthInputId}
              type="text"
              inputMode="numeric"
              value={displayValue}
              placeholder={inputPlaceholder}
              onChange={handleValueChange}
              onBlur={handleBlur}
              className={inputClassName}
            />
          )}
          <ComboBox
            options={options}
            value={value.type}
            onValueChange={handleTypeChange}
            placeholder="Select type"
            className={comboBoxClassName}
            contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
          />
        </div>
      </>
    );
  },
);

WidthControls.displayName = 'WidthControls';
