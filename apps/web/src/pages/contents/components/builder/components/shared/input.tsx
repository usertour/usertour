import { Input } from '@usertour/ui';
import { RiAddLine, RiSubtractLine } from '@usertour/icons';
import { memo, useCallback, useState } from 'react';
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

const stepButtonClass =
  'inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-40';

export const InputNumber = memo((props: InputNumberProps) => {
  const {
    defaultNumber,
    onValueChange,
    placeholder = '',
    allowEmpty = false,
    allowNegative = false,
  } = props;

  // The local string buffer holds intermediate input (a lone "-", an empty
  // string) that isn't yet a valid number. When `defaultNumber` changes from
  // the outside we resync the buffer during render — the React-recommended
  // alternative to a sync effect, so there's no mirrored-state-via-useEffect.
  const [inputValue, setInputValue] = useState(
    defaultNumber !== undefined ? String(defaultNumber) : '',
  );
  const [prevDefault, setPrevDefault] = useState(defaultNumber);
  if (defaultNumber !== prevDefault) {
    setPrevDefault(defaultNumber);
    setInputValue(defaultNumber !== undefined ? String(defaultNumber) : '');
  }

  const handleIncrement = useCallback(() => {
    const current = inputValue === '' ? 0 : Number(inputValue);
    const next = current + 1;
    setInputValue(String(next));
    onValueChange(next);
  }, [inputValue, onValueChange]);

  const handleDecrement = useCallback(() => {
    const current = inputValue === '' ? 0 : Number(inputValue);
    const next = current - 1;
    if (!allowNegative && next < 0) {
      return;
    }
    setInputValue(String(next));
    onValueChange(next);
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
    <div className="relative">
      <Input
        variant="compact-muted"
        type="text"
        inputMode="numeric"
        className="pe-14 bg-surface shadow-none"
        value={inputValue}
        placeholder={placeholder}
        onChange={handleOnChange}
      />
      <div className="absolute inset-y-0 end-1 flex items-center gap-0.5">
        <button type="button" className={stepButtonClass} onClick={handleDecrement}>
          <RiSubtractLine className="h-3.5 w-3.5 flex-shrink-0" />
        </button>
        <button type="button" className={stepButtonClass} onClick={handleIncrement}>
          <RiAddLine className="h-3.5 w-3.5 flex-shrink-0" />
        </button>
      </div>
    </div>
  );
});

InputNumber.displayName = 'InputNumber';
