import { ChangeEvent } from 'react';

import { Input } from '@usertour-packages/input';
import { cn } from '@usertour-packages/tailwind';
import { QuestionTooltip } from '@usertour-packages/tooltip';

import { ThemeSettingErrorPopover } from './theme-setting-error-popover';

type ThemeSettingInputProps = {
  text: string;
  placeholder?: string;
  name: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disableUnit?: boolean;
  unit?: string;
  tooltip?: string;
  disabled?: boolean;
  error?: string;
  vertical?: boolean;
};

export const ThemeSettingInput = (props: ThemeSettingInputProps) => {
  const {
    text,
    placeholder = '',
    name,
    onChange,
    defaultValue,
    disableUnit = false,
    unit = 'px',
    tooltip,
    disabled = false,
    error,
    vertical = false,
  } = props;

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const inputElement = (
    <Input
      type="text"
      id={name}
      name={name}
      value={defaultValue}
      onChange={handleOnChange}
      disabled={disabled}
      className={cn(
        'py-3 px-4 ps-4 block w-full shadow-sm rounded-lg text-sm disabled:opacity-100',
        disableUnit ? 'pe-4' : 'pe-8',
      )}
      placeholder={placeholder}
    />
  );

  return (
    <div className={cn('flex', vertical ? 'flex-col' : 'flex-row')}>
      <div className="text-sm grow flex items-center space-x-1">
        <label htmlFor={name} className="block text-sm leading-9">
          {text}
        </label>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </div>
      <div className={cn('relative', vertical ? 'w-full' : 'flex-none w-36')}>
        <ThemeSettingErrorPopover error={error}>{inputElement}</ThemeSettingErrorPopover>
        {!disableUnit && (
          <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none z-1 pe-4">
            <span className="text-muted-foreground">{unit}</span>
          </div>
        )}
      </div>
    </div>
  );
};

ThemeSettingInput.displayName = 'ThemeSettingInput';
