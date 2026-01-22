// Single selection (radio) display component - shared between editor and serialize

import { cn } from '@usertour-packages/tailwind';
import * as Widget from '@usertour-packages/widget';
import { forwardRef, memo, useCallback, useState } from 'react';

import type { ContentEditorMultipleChoiceOption } from '../../../types/editor';
import {
  DEFAULT_OTHER_PLACEHOLDER,
  OPTION_ITEM_BASE_CLASS,
  OPTION_ITEM_EDITING_CLASS,
} from './constants';
import { OptionItem } from './option-item';
import { OtherOptionInput } from './other-option-input';

interface SingleSelectionDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  options: ContentEditorMultipleChoiceOption[];
  enableOther?: boolean;
  otherPlaceholder?: string;
  defaultValue?: string;
  isInteractive?: boolean;
  onValueChange?: (value: string) => void;
  onOtherSubmit?: (value: string) => void;
}

export const SingleSelectionDisplay = memo(
  forwardRef<HTMLDivElement, SingleSelectionDisplayProps>(
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
            <Widget.RadioGroup
              defaultValue={defaultValue}
              onValueChange={isInteractive ? handleValueChange : undefined}
            >
              {options.map((option, index) => (
                <OptionItem key={index}>
                  <Widget.RadioGroupItem value={option.value} id={`r1${index}`} />
                  <Widget.Label htmlFor={`r1${index}`} className="grow cursor-pointer">
                    {option.label || option.value}
                  </Widget.Label>
                </OptionItem>
              ))}
              {enableOther && (
                <div
                  className={cn(
                    OPTION_ITEM_BASE_CLASS,
                    isInteractive && isEditing && OPTION_ITEM_EDITING_CLASS,
                  )}
                >
                  <Widget.RadioGroupItem value="other" id="other-radio" />
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
                    <Widget.Label className="grow cursor-pointer">
                      {otherPlaceholder || DEFAULT_OTHER_PLACEHOLDER}
                    </Widget.Label>
                  )}
                </div>
              )}
            </Widget.RadioGroup>
          </div>
        </div>
      );
    },
  ),
);

SingleSelectionDisplay.displayName = 'SingleSelectionDisplay';
