// Single selection (radio) serialize component

import { Label } from '@usertour-packages/label';
import { cn } from '@usertour-packages/tailwind';
import * as Widget from '@usertour-packages/widget';
import { memo, useCallback, useState } from 'react';

import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';
import { OPTION_ITEM_BASE_CLASS, OPTION_ITEM_EDITING_CLASS } from './constants';
import { OptionItem } from './option-item';
import { OtherOptionInput } from './other-option-input';

interface SingleSelectionSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  options: ContentEditorMultipleChoiceOption[];
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => Promise<void> | void;
}

export const SingleSelectionSerialize = memo(
  ({ element, options, onClick }: SingleSelectionSerializeProps) => {
    const [otherValue, setOtherValue] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const handleValueChange = useCallback(
      (value: string) => {
        if (value !== 'other') {
          onClick?.(element, value);
        }
      },
      [element, onClick],
    );

    const handleOtherSubmit = useCallback(() => {
      onClick?.(element, otherValue);
    }, [element, onClick, otherValue]);

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            <Widget.RadioGroup onValueChange={handleValueChange}>
              {options.map((option, index) => (
                <OptionItem key={index}>
                  <Widget.RadioGroupItem value={option.value} id={`r1${index}`} />
                  <Label
                    htmlFor={`r1${index}`}
                    className="grow cursor-pointer text-sdk-base leading-none"
                  >
                    {option.label || option.value}
                  </Label>
                </OptionItem>
              ))}
              {element.data.enableOther && (
                <div className={cn(OPTION_ITEM_BASE_CLASS, isEditing && OPTION_ITEM_EDITING_CLASS)}>
                  <Widget.RadioGroupItem value="other" id="other-radio" />
                  <OtherOptionInput
                    placeholder={element.data.otherPlaceholder}
                    value={otherValue}
                    isEditing={isEditing}
                    onValueChange={setOtherValue}
                    onEditingChange={setIsEditing}
                    onSubmit={handleOtherSubmit}
                    showSubmitButton
                  />
                </div>
              )}
            </Widget.RadioGroup>
          </div>
        </div>
      </div>
    );
  },
);

SingleSelectionSerialize.displayName = 'SingleSelectionSerialize';
