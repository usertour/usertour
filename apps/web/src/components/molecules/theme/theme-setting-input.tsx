import { Input } from '@usertour-packages/input';
import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { ChangeEvent } from 'react';

type ThemeSettingInputProps = {
  text: string;
  placeholder?: string;
  name: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disableUnit?: boolean;
  tooltip?: string;
  disabled?: boolean;
  error?: string;
};

export const ThemeSettingInput = (props: ThemeSettingInputProps) => {
  const {
    text,
    placeholder = '',
    name,
    onChange,
    defaultValue,
    disableUnit = false,
    tooltip,
    disabled = false,
    error,
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
        error && 'border-destructive focus-visible:ring-destructive',
      )}
      placeholder={placeholder}
    />
  );

  return (
    <div className="flex flex-row">
      <div className="text-sm grow flex items-center space-x-1">
        <label htmlFor={name} className="block text-sm leading-9">
          {text}
        </label>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </div>
      <div className="flex-none w-36 relative">
        {error ? (
          <Popover open={!!error}>
            <PopoverAnchor asChild>{inputElement}</PopoverAnchor>
            <PopoverContent
              side="right"
              sideOffset={5}
              className="bg-destructive text-destructive-foreground rounded-lg p-2 w-auto text-sm border-0"
            >
              {error}
              <PopoverArrow className="fill-destructive" width={10} height={5} />
            </PopoverContent>
          </Popover>
        ) : (
          inputElement
        )}
        {!disableUnit && (
          <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none z-1 pe-4">
            <span className="text-gray-500">px</span>
          </div>
        )}
      </div>
    </div>
  );
};

ThemeSettingInput.displayName = 'ThemeSettingInput';
