// Single selection (radio) component for SDK widget

import { cn } from '@usertour/tailwind';
import { forwardRef, memo, useCallback, useId, useState } from 'react';

import { Label, RadioGroup, RadioGroupItem } from '../primitives';
import { useWidgetLocale } from '../locale/context';
import { OPTION_ITEM_BASE_CLASS, OPTION_ITEM_EDITING_CLASS } from './constants';
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
      const { messages } = useWidgetLocale();
      // Instance-unique id prefix: the old hard-coded `r1${index}` ids collided
      // across co-mounted question instances, so a Label's htmlFor could resolve
      // to ANOTHER instance's radio — clicking the label text then did nothing.
      const uid = useId();
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
                  <RadioGroupItem value={option.value} id={`${uid}-${index}`} />
                  <Label htmlFor={`${uid}-${index}`} className="grow cursor-pointer">
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
                  <RadioGroupItem value="other" id={`${uid}-other`} />
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
                      {otherPlaceholder || messages.otherPlaceholder}
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
