import { memo, useCallback, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Input, QuestionTooltip } from '@usertour/ui';
import { useTranslation } from 'react-i18next';

export interface ContentWidthProps {
  width: number | undefined;
  defaultWidth: number;
  onChange: (width: number | undefined) => void;
  type: 'modal' | 'tooltip' | 'checklist' | 'bubble';
}

export const ContentWidth = memo((props: ContentWidthProps) => {
  const { type, width, defaultWidth, onChange } = props;
  const { t } = useTranslation();

  // Resync the local string buffer from `width` during render (no sync effect).
  const [inputValue, setInputValue] = useState(width !== undefined ? String(width) : '');
  const [prevWidth, setPrevWidth] = useState(width);
  if (width !== prevWidth) {
    setPrevWidth(width);
    setInputValue(width !== undefined ? String(width) : '');
  }

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

  const hasError = width === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start space-x-1">
        <h1 className="text-sm">{t('contentBuilder.shared.width')}</h1>
        <QuestionTooltip>{t(`contentBuilder.shared.widthTooltip.${type}`)}</QuestionTooltip>
      </div>
      <div className="relative">
        <Input
          variant="compact-muted"
          type="text"
          inputMode="numeric"
          className="pe-9 bg-surface dark:bg-surface-raised shadow-none"
          value={inputValue}
          placeholder={t('contentBuilder.shared.widthPlaceholder', { value: defaultWidth })}
          onChange={handleOnChange}
        />
        <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground text-sm pointer-events-none">
          px
        </span>
        {hasError && (
          <p className="mt-1 text-xs text-destructive">
            {t('contentBuilder.shared.widthCannotBeZero')}
          </p>
        )}
      </div>
    </div>
  );
});

ContentWidth.displayName = 'ContentWidth';
