// Single selection (radio) component for SDK widget

import { cn } from '@usertour-packages/tailwind';
import { forwardRef, memo, useCallback, useState } from 'react';

import { Label, RadioGroup, RadioGroupItem } from '../primitives';
import {
  DEFAULT_OTHER_PLACEHOLDER,
  OPTION_ITEM_BASE_CLASS,
  OPTION_ITEM_EDITING_CLASS,
} from './constants';
import { OptionItem } from './option-item';
import { OtherOptionInput } from './other-option-input';
import type { SelectionOption } from './types';

export interface SingleSelectionProps extends React.HTMLAttributes<HTMLDivElement> {
  options: SelectionOption[];
  enableOther?: boolean;
  otherPlaceholder?: string;
  defaultValue?: string;
  isInteractive?: boolean;
  onValueChange?: (value: string) => void;
  onOtherSubmit?: (value: string) => void;
}

/**
 * Single selection (radio) component for SDK widget
 * Displays radio button options for single choice selection
 */
export const SingleSelection = memo(
  forwardRef<HTMLDivElement, SingleSelectionProps>(
    (
      {
        options,
        enableOther = false,
        otherPlaceholder,
        defaultValue,
        isInteractive = false,
        onValueChange,
        onOtherSubmit,
        ...props
      },
      ref,
    ) => {
      const [otherValue, setOtherValue] = useState<string>('');
      const [isEditing, setIsEditing] = useState<boolean>(false);

      const handleValueChange = useCallback(
        (value: string) => {
          if (!isInteractive) return;
          if (value !== 'other') {
            onValueChange?.(value);
          }
        },
        [isInteractive, onValueChange],
      );

      const handleOtherSubmit = useCallback(() => {
        if (!isInteractive) return;
        onOtherSubmit?.(otherValue);
      }, [isInteractive, onOtherSubmit, otherValue]);

      return (
        <div ref={ref} className="flex flex-col gap-2 w-full" {...props}>
          <div className="space-y-2">
            <RadioGroup
              defaultValue={defaultValue}
              onValueChange={isInteractive ? handleValueChange : undefined}
            >
              {options.map((option, index) => (
                <OptionItem key={index}>
                  <RadioGroupItem value={option.value} id={`r1${index}`} />
                  <Label htmlFor={`r1${index}`} className="grow cursor-pointer">
                    {option.label || option.value}
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
                  <RadioGroupItem value="other" id="other-radio" />
                  {isInteractive ? (
                    <OtherOptionInput
                      placeholder={otherPlaceholder}
                      value={otherValue}
                      isEditing={isEditing}
                      onValueChange={setOtherValue}
                      onEditingChange={setIsEditing}
                      onSubmit={handleOtherSubmit}
                      showSubmitButton
                    />
                  ) : (
                    <Label className="grow cursor-pointer">
                      {otherPlaceholder || DEFAULT_OTHER_PLACEHOLDER}
                    </Label>
                  )}
                </div>
              )}
            </RadioGroup>
          </div>
        </div>
      );
    },
  ),
);

SingleSelection.displayName = 'SingleSelection';

// Backward compatibility alias
export const SingleSelectionDisplay = SingleSelection;
export type SingleSelectionDisplayProps = SingleSelectionProps;
