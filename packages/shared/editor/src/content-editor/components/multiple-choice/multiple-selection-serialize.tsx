// Multiple selection (checkbox) serialize component

import { cn } from '@usertour-packages/tailwind';
import * as Widget from '@usertour-packages/widget';
import { memo, useCallback, useRef, useState } from 'react';

import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';
import {
  DEFAULT_BUTTON_TEXT,
  DEFAULT_OPTION_PREFIX,
  DEFAULT_OTHER_PLACEHOLDER,
  OPTION_ITEM_BASE_CLASS,
  OPTION_ITEM_EDITING_CLASS,
  OTHER_INPUT_CLASS,
} from './constants';
import { OptionItem } from './option-item';

interface MultipleSelectionSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  options: ContentEditorMultipleChoiceOption[];
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => Promise<void> | void;
}

export const MultipleSelectionSerialize = memo(
  ({ element, options, onClick }: MultipleSelectionSerializeProps) => {
    const [otherValue, setOtherValue] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    const [isOtherChecked, setIsOtherChecked] = useState<boolean>(false);
    const otherInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    const isValidSelection = useCallback(() => {
      const count = selectedValues.length + (isOtherChecked && otherValue ? 1 : 0);
      const lowRange = Number(element.data.lowRange) || 0;
      // When enableOther is true, the max selectable count should include the "Other" option
      const maxOptions = options.length + (element.data.enableOther ? 1 : 0);
      const highRange = Number(element.data.highRange) || maxOptions;
      return count >= lowRange && count <= highRange;
    }, [
      selectedValues.length,
      isOtherChecked,
      otherValue,
      element.data.lowRange,
      element.data.highRange,
      element.data.enableOther,
      options.length,
    ]);

    const handleOptionClick = useCallback((value: string) => {
      setSelectedValues((prev) => {
        if (prev.includes(value)) {
          return prev.filter((v) => v !== value);
        }
        return [...prev, value];
      });
    }, []);

    const handleSubmit = useCallback(async () => {
      if (isValidSelection() && onClick) {
        setLoading(true);
        try {
          const values = [...selectedValues];
          if (isOtherChecked && otherValue) {
            values.push(otherValue);
          }
          await onClick(element, values);
        } finally {
          setLoading(false);
        }
      }
    }, [isValidSelection, selectedValues, isOtherChecked, otherValue, onClick, element]);

    const handleOtherCheckboxClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOtherChecked) {
          setOtherValue('');
          setIsOtherChecked(false);
        } else {
          setIsEditing(true);
          otherInputRef.current?.focus();
        }
      },
      [isOtherChecked],
    );

    const handleOtherInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setOtherValue(e.target.value);
      setIsOtherChecked(!!e.target.value);
    }, []);

    const handleOtherSpanClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
    }, []);

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            {options.map((option, index) => (
              <OptionItem key={index} onClick={() => handleOptionClick(option.value)}>
                <Widget.Checkbox checked={selectedValues.includes(option.value)} />
                <span className="grow cursor-pointer text-sdk-base leading-none">
                  {option.label || option.value || `${DEFAULT_OPTION_PREFIX} ${index + 1}`}
                </span>
              </OptionItem>
            ))}
            {element.data.enableOther && (
              <div className={cn(OPTION_ITEM_BASE_CLASS, isEditing && OPTION_ITEM_EDITING_CLASS)}>
                <Widget.Checkbox checked={isOtherChecked} onClick={handleOtherCheckboxClick} />
                <div className="flex items-center grow gap-2 relative">
                  {isEditing ? (
                    <input
                      ref={otherInputRef}
                      placeholder={element.data.otherPlaceholder || DEFAULT_OTHER_PLACEHOLDER}
                      value={otherValue}
                      onChange={handleOtherInputChange}
                      className={OTHER_INPUT_CLASS}
                    />
                  ) : (
                    <span
                      className="grow cursor-pointer text-sdk-base leading-none"
                      onClick={handleOtherSpanClick}
                    >
                      {otherValue || element.data.otherPlaceholder || DEFAULT_OTHER_PLACEHOLDER}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-center w-full">
            <Widget.Button disabled={!isValidSelection() || loading} onClick={handleSubmit}>
              {element.data.buttonText || DEFAULT_BUTTON_TEXT}
            </Widget.Button>
          </div>
        </div>
      </div>
    );
  },
);

MultipleSelectionSerialize.displayName = 'MultipleSelectionSerialize';
