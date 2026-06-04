import { Input } from '@usertour/ui';
import { RiAddLine, RiSubtractLine } from '@usertour/icons';
import { useState, useEffect, memo, useCallback } from 'react';
import type { ChangeEvent } from 'react';

export interface InputNumberProps {
  defaultNumber: number | undefined;
  onValueChange: (num: number | undefined) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  // Allow negative values. Off by default — only genuinely signed fields
  // (e.g. alignment offsets) opt in; widths / positions stay >= 0.
  allowNegative?: boolean;
}

// The local string buffer is intentional: it lets the field hold intermediate
// input (a lone "-", an empty string) that isn't yet a valid number, and the
// effect keeps it in sync when `defaultNumber` changes from the outside.
const stepButtonClass =
  'w-6 h-6 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-background-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600';

export const InputNumber = memo((props: InputNumberProps) => {
  const {
    defaultNumber,
    onValueChange,
    placeholder = '',
    allowEmpty = false,
    allowNegative = false,
  } = props;
  const [inputValue, setInputValue] = useState<string>(
    defaultNumber !== undefined ? String(defaultNumber) : '',
  );

  // Sync with external defaultNumber changes
  useEffect(() => {
    setInputValue(defaultNumber !== undefined ? String(defaultNumber) : '');
  }, [defaultNumber]);

  const handleIncrement = useCallback(() => {
    const currentNum = inputValue === '' ? 0 : Number(inputValue);
    const newValue = currentNum + 1;
    setInputValue(String(newValue));
    onValueChange(newValue);
  }, [inputValue, onValueChange]);

  const handleDecrement = useCallback(() => {
    const currentNum = inputValue === '' ? 0 : Number(inputValue);
    const newValue = currentNum - 1;
    if (!allowNegative && newValue < 0) {
      return;
    }
    setInputValue(String(newValue));
    onValueChange(newValue);
  }, [inputValue, onValueChange, allowNegative]);

  const handleOnChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Allow empty value if allowEmpty is true
      if (value === '') {
        setInputValue('');
        if (allowEmpty) {
          onValueChange(undefined);
        }
        return;
      }

      // Only allow numeric input (optionally signed)
      const pattern = allowNegative ? /^-?\d*$/ : /^\d*$/;
      if (pattern.test(value)) {
        setInputValue(value);
        const numValue = Number(value);
        if (!Number.isNaN(numValue)) {
          onValueChange(numValue);
        }
      }
    },
    [allowEmpty, allowNegative, onValueChange],
  );

  return (
    <div className="px-3 py-1 rounded-lg bg-background-700">
      <div className="w-full flex justify-between items-center gap-x-5">
        <div className="grow">
          <Input
            className="px-0 h-8 w-full rounded-md border-0 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 bg-transparent"
            type="text"
            onChange={handleOnChange}
            value={inputValue}
            placeholder={placeholder}
          />
        </div>
        <div className="flex justify-end items-center gap-x-1.5">
          <button type="button" className={stepButtonClass} onClick={handleDecrement}>
            <RiSubtractLine className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
          <button type="button" className={stepButtonClass} onClick={handleIncrement}>
            <RiAddLine className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
});

InputNumber.displayName = 'InputNumber';
