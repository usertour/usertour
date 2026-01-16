import { memo, useCallback, useState, useEffect, ChangeEvent } from 'react';
import { Input } from '@usertour-packages/input';
import { QuestionTooltip } from '@usertour-packages/tooltip';

export interface ContentWidthProps {
  width: number | undefined;
  defaultWidth: number;
  onChange: (width: number | undefined) => void;
  type: 'modal' | 'tooltip' | 'checklist' | 'bubble';
}

const tooltipContent = {
  modal: 'The width in pixels of the modal. Leave empty to use the theme default.',
  tooltip: 'The width in pixels of the tooltip. Leave empty to use the theme default.',
  checklist: 'The width in pixels of the checklist. Leave empty to use the theme default.',
  bubble: 'The width in pixels of the bubble. Leave empty to use the theme default.',
} as const;

export const ContentWidth = memo((props: ContentWidthProps) => {
  const { type, width, defaultWidth, onChange } = props;
  const [inputValue, setInputValue] = useState<string>(width !== undefined ? String(width) : '');

  // Sync with external width changes
  useEffect(() => {
    setInputValue(width !== undefined ? String(width) : '');
  }, [width]);

  const handleOnChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Allow empty value
      if (value === '') {
        setInputValue('');
        onChange(undefined);
        return;
      }

      // Only allow numeric input
      if (/^\d*$/.test(value)) {
        setInputValue(value);
        const numValue = Number(value);
        if (!Number.isNaN(numValue)) {
          onChange(numValue);
        }
      }
    },
    [onChange],
  );

  const placeholder = `Default: ${defaultWidth}`;
  const hasError = width === 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-start items-center space-x-1">
        <h1 className="text-sm">Width</h1>
        <QuestionTooltip>{tooltipContent[type]}</QuestionTooltip>
      </div>
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleOnChange}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border-0 bg-background-700 px-4 pe-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="absolute inset-y-0 end-0 flex items-center pointer-events-none pe-4">
          <span className="text-muted-foreground">px</span>
        </div>
        {hasError && <p className="text-xs text-red-500 mt-1">Width cannot be 0</p>}
      </div>
    </div>
  );
});

ContentWidth.displayName = 'ContentWidth';
