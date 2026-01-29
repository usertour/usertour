// Unified "Other" option input component for both single and multiple selection modes

import { RiCheckFill } from '@usertour-packages/icons';
import { memo, useCallback, useEffect, useRef } from 'react';

import { Button } from '../primitives';
import {
  DEFAULT_OTHER_PLACEHOLDER,
  OTHER_INPUT_CLASS,
  OTHER_SUBMIT_BUTTON_CLASS,
} from './constants';

export interface OtherOptionInputProps {
  placeholder?: string;
  value: string;
  isEditing: boolean;
  onValueChange: (value: string) => void;
  onEditingChange: (isEditing: boolean) => void;
  onSubmit?: () => void;
  showSubmitButton?: boolean;
}

/**
 * Other option input component for selection components
 * Provides text input for custom "Other" option
 */
export const OtherOptionInput = memo(
  ({
    placeholder,
    value,
    isEditing,
    onValueChange,
    onEditingChange,
    onSubmit,
    showSubmitButton = false,
  }: OtherOptionInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when entering edit mode
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange(e.target.value);
      },
      [onValueChange],
    );

    const handleSubmitClick = useCallback(() => {
      onEditingChange(false);
      onSubmit?.();
    }, [onEditingChange, onSubmit]);

    const handleSpanClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onEditingChange(true);
      },
      [onEditingChange],
    );

    const displayPlaceholder = placeholder || DEFAULT_OTHER_PLACEHOLDER;

    if (isEditing) {
      return (
        <div className="flex items-center grow gap-2 relative">
          <input
            ref={inputRef}
            placeholder={displayPlaceholder}
            value={value}
            onChange={handleInputChange}
            className={OTHER_INPUT_CLASS}
          />
          {showSubmitButton && (
            <Button
              variant="custom"
              className={OTHER_SUBMIT_BUTTON_CLASS}
              onClick={handleSubmitClick}
            >
              <RiCheckFill className="w-full h-full" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center grow gap-2 relative">
        <span className="grow cursor-pointer text-sdk-base leading-none" onClick={handleSpanClick}>
          {value || displayPlaceholder}
        </span>
      </div>
    );
  },
);

OtherOptionInput.displayName = 'OtherOptionInput';
