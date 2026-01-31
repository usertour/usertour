import { Input } from '@usertour-packages/input';
import { useState, useEffect, memo, useCallback } from 'react';
import type { ChangeEvent } from 'react';

export interface InputNumberProps {
  defaultNumber: number | undefined;
  onValueChange: (num: number | undefined) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

export const InputNumber = memo((props: InputNumberProps) => {
  const { defaultNumber, onValueChange, placeholder = '', allowEmpty = false } = props;
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
    setInputValue(String(newValue));
    onValueChange(newValue);
  }, [inputValue, onValueChange]);

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

      // Only allow numeric input
      if (/^-?\d*$/.test(value)) {
        setInputValue(value);
        const numValue = Number(value);
        if (!Number.isNaN(numValue)) {
          onValueChange(numValue);
        }
      }
    },
    [allowEmpty, onValueChange],
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
          <button
            type="button"
            className="w-6 h-6 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-background-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
            onClick={handleDecrement}
          >
            <svg
              className="flex-shrink-0 w-3.5 h-3.5"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            className="w-6 h-6 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-background-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
            onClick={handleIncrement}
          >
            <svg
              className="flex-shrink-0 w-3.5 h-3.5"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

InputNumber.displayName = 'InputNumber';
