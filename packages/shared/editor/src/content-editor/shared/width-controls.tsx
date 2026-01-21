// Shared WidthControls component for content editor elements

import type { ComboBoxOption } from '@usertour-packages/combo-box';
import { ComboBox } from '@usertour-packages/combo-box';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { memo, useCallback, useId } from 'react';

import type { DimensionConfig } from '../types/width';

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
    inputClassName = 'bg-background',
    comboBoxClassName = 'flex-none w-20 h-auto px-2',
  }: WidthControlsProps) => {
    const id = useId();
    const widthInputId = `${id}-width-input`;

    const handleTypeChange = useCallback(
      (type: string) => {
        onTypeChange(type);
      },
      [onTypeChange],
    );

    const handleValueChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange(e);
      },
      [onValueChange],
    );

    return (
      <>
        <Label htmlFor={widthInputId}>{label}</Label>
        <div className="flex gap-x-2">
          {showValueInput && (
            <Input
              id={widthInputId}
              type="text"
              value={value.value?.toString() ?? ''}
              placeholder={inputPlaceholder}
              onChange={handleValueChange}
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
