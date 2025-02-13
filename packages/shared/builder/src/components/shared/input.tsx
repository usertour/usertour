import { useState } from 'react';
import type { ChangeEvent } from 'react';

export const InputNumber = (props: {
  defaultNumber: number;
  onValueChange: (num: number) => void;
}) => {
  const { defaultNumber = 0, onValueChange } = props;
  const [num, setNum] = useState<number>(defaultNumber);
  const handleIncrement = () => {
    const newValue = num + 1;
    setNum(newValue);
    onValueChange(newValue);
  };
  const handleDecrement = () => {
    const newValue = num - 1;
    setNum(newValue);
    onValueChange(newValue);
  };
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const value = Number(e.target.value);
      setNum(value);
      onValueChange(value);
    }
  };
  return (
    <div className="px-3 py-1  rounded-lg bg-background-700">
      <div className="w-full flex justify-between items-center gap-x-5">
        <div className="grow">
          <input
            className="h-8 w-full rounded-md border-0	 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 bg-transparent"
            type="text"
            onChange={handleOnChange}
            value={num}
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
};

InputNumber.displayName = 'InputNumber';
