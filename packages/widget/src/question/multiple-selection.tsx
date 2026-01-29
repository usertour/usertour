// Multiple selection (checkbox) component for SDK widget

import { cn } from '@usertour-packages/tailwind';
import { forwardRef, memo, useCallback, useState } from 'react';

import { Button, Checkbox, Label } from '../primitives';
import {
  DEFAULT_BUTTON_TEXT,
  DEFAULT_OPTION_PREFIX,
  DEFAULT_OTHER_PLACEHOLDER,
  OPTION_ITEM_BASE_CLASS,
  OPTION_ITEM_EDITING_CLASS,
} from './constants';
import { OptionItem } from './option-item';
import { OtherOptionInput } from './other-option-input';
import type { SelectionOption } from './types';

export interface MultipleSelectionProps extends React.HTMLAttributes<HTMLDivElement> {
  options: SelectionOption[];
  enableOther?: boolean;
  otherPlaceholder?: string;
  buttonText?: string;
  lowRange?: number;
  highRange?: number;
  isInteractive?: boolean;
  onValueChange?: (values: string[]) => Promise<void> | void;
  // For preview mode - controlled checkbox state
  checkedValues?: string[];
  onCheckedChange?: (index: number, checked: boolean) => void;
}

/**
 * Multiple selection (checkbox) component for SDK widget
 * Displays checkbox options for multiple choice selection
 */
export const MultipleSelection = memo(
  forwardRef<HTMLDivElement, MultipleSelectionProps>(
    (
      {
        options,
        enableOther = false,
        otherPlaceholder,
        buttonText,
        lowRange = 0,
        highRange,
        isInteractive = false,
        onValueChange,
        checkedValues,
        onCheckedChange,
        ...props
      },
      ref,
    ) => {
      const [otherValue, setOtherValue] = useState<string>('');
      const [isEditing, setIsEditing] = useState<boolean>(false);
      const [selectedValues, setSelectedValues] = useState<string[]>([]);
      const [isOtherChecked, setIsOtherChecked] = useState<boolean>(false);
      const [loading, setLoading] = useState(false);

      const effectiveHighRange = highRange || options.length + (enableOther ? 1 : 0);

      const isValidSelection = useCallback(() => {
        const count = selectedValues.length + (isOtherChecked && otherValue ? 1 : 0);
        return count >= lowRange && count <= effectiveHighRange;
      }, [selectedValues.length, isOtherChecked, otherValue, lowRange, effectiveHighRange]);

      const handleOptionClick = useCallback(
        (value: string, index: number) => {
          if (!isInteractive) {
            // Preview mode - use controlled state
            const isChecked = checkedValues?.includes(value) ?? false;
            onCheckedChange?.(index, !isChecked);
            return;
          }
          // Interactive mode - use internal state
          setSelectedValues((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
          );
        },
        [isInteractive, checkedValues, onCheckedChange],
      );

      const handleSubmit = useCallback(async () => {
        if (!isInteractive || !isValidSelection() || !onValueChange) return;
        setLoading(true);
        try {
          const values = [...selectedValues];
          if (isOtherChecked && otherValue) {
            values.push(otherValue);
          }
          await onValueChange(values);
        } finally {
          setLoading(false);
        }
      }, [
        isInteractive,
        isValidSelection,
        selectedValues,
        isOtherChecked,
        otherValue,
        onValueChange,
      ]);

      const handleOtherCheckboxClick = useCallback(
        (e: React.MouseEvent) => {
          if (!isInteractive) return;
          e.stopPropagation();
          if (isOtherChecked) {
            setOtherValue('');
            setIsOtherChecked(false);
          } else {
            setIsEditing(true);
          }
        },
        [isInteractive, isOtherChecked],
      );

      const handleOtherValueChange = useCallback((val: string) => {
        setOtherValue(val);
        setIsOtherChecked(!!val);
      }, []);

      const getCheckboxChecked = useCallback(
        (value: string, index: number): boolean => {
          if (!isInteractive) {
            // Preview mode
            return checkedValues?.includes(value) ?? options[index]?.checked ?? false;
          }
          // Interactive mode
          return selectedValues.includes(value);
        },
        [isInteractive, checkedValues, options, selectedValues],
      );

      return (
        <div ref={ref} className="flex flex-col gap-2 w-full" {...props}>
          <div className="space-y-2">
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <OptionItem key={index}>
                  <Checkbox
                    checked={getCheckboxChecked(option.value, index)}
                    id={`c1${index}`}
                    onCheckedChange={() => handleOptionClick(option.value, index)}
                  />
                  <Label htmlFor={`c1${index}`} className="grow cursor-pointer">
                    {option.label || option.value || `${DEFAULT_OPTION_PREFIX} ${index + 1}`}
                  </Label>
                </OptionItem>
              ))}
              {enableOther && (
                <div
                  className={cn(
                    OPTION_ITEM_BASE_CLASS,
                    isInteractive && isEditing && OPTION_ITEM_EDITING_CLASS,
                  )}
                >
                  <Checkbox
                    checked={isOtherChecked}
                    onClick={isInteractive ? handleOtherCheckboxClick : undefined}
                  />
                  {isInteractive ? (
                    <OtherOptionInput
                      placeholder={otherPlaceholder}
                      value={otherValue}
                      isEditing={isEditing}
                      onValueChange={handleOtherValueChange}
                      onEditingChange={setIsEditing}
                    />
                  ) : (
                    <Label className="grow cursor-pointer">
                      {otherPlaceholder || DEFAULT_OTHER_PLACEHOLDER}
                    </Label>
                  )}
                </div>
              )}
              <div className="flex justify-center w-full">
                <Button
                  disabled={isInteractive ? !isValidSelection() || loading : false}
                  onClick={isInteractive ? handleSubmit : undefined}
                >
                  {buttonText || DEFAULT_BUTTON_TEXT}
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    },
  ),
);

MultipleSelection.displayName = 'MultipleSelection';

// Backward compatibility alias
export const MultipleSelectionDisplay = MultipleSelection;
export type MultipleSelectionDisplayProps = MultipleSelectionProps;
