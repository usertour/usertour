// Shared serialize component for text input editors (SingleLineText, MultiLineText)

import * as Widget from '@usertour-packages/widget';
import { isEmptyString } from '@usertour/helpers';
import { memo, useCallback, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

// Constants
const DEFAULT_PLACEHOLDER = 'Enter text...';
const DEFAULT_BUTTON_TEXT = 'Submit';

// Types
export interface TextInputElementData {
  placeholder?: string;
  buttonText?: string;
  required?: boolean;
}

export interface TextInputSerializeProps<T extends { data: TextInputElementData }> {
  element: T;
  onClick?: (element: T, value: string) => Promise<void> | void;
  // Use 'input' or 'textarea' to specify the input type
  inputType: 'input' | 'textarea';
  // Optional class name for the input component
  inputClassName?: string;
}

// Generic text input serialize component
function TextInputSerializeInner<T extends { data: TextInputElementData }>({
  element,
  onClick,
  inputType,
  inputClassName,
}: TextInputSerializeProps<T>) {
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Memoize computed values
  const isDisabled = useMemo(
    () => loading || (element.data.required && isEmptyString(value)),
    [loading, element.data.required, value],
  );

  const defaultValues = useMemo(
    () => ({
      placeholder: element.data.placeholder || DEFAULT_PLACEHOLDER,
      buttonText: element.data.buttonText || DEFAULT_BUTTON_TEXT,
    }),
    [element.data.placeholder, element.data.buttonText],
  );

  const handleValueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (onClick) {
      setLoading(true);
      try {
        await onClick(element, value);
      } finally {
        setLoading(false);
      }
    }
  }, [onClick, element, value]);

  // Render the appropriate input component
  const InputComponent = inputType === 'textarea' ? Widget.Textarea : Widget.Input;
  const inputProps = inputType === 'input' ? { className: inputClassName || 'grow h-auto' } : {};

  return (
    <div className="flex flex-col gap-2 items-center w-full">
      <InputComponent
        placeholder={defaultValues.placeholder}
        value={value}
        onChange={handleValueChange}
        aria-label="Text input field"
        {...inputProps}
      />
      <div className="flex justify-end w-full">
        <Widget.Button
          className={inputType === 'input' ? 'flex-none' : undefined}
          onClick={handleSubmit}
          disabled={isDisabled}
          aria-label={`Submit ${defaultValues.buttonText}`}
        >
          {defaultValues.buttonText}
        </Widget.Button>
      </div>
    </div>
  );
}

// Memoized version with generic support
export const TextInputSerialize = memo(TextInputSerializeInner) as typeof TextInputSerializeInner;

// Export constants for use in other components
export { DEFAULT_PLACEHOLDER, DEFAULT_BUTTON_TEXT };
