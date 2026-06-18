// Embed URL input component with load button

import { Button, Input, Label, QuestionTooltip } from '@usertour/ui';
import { ArrowRightIcon } from '@usertour/icons';
import { memo, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';

export interface EmbedUrlInputProps {
  url: string;
  isLoading: boolean;
  onUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

export const EmbedUrlInput = memo(
  ({ url, isLoading, onUrlChange, onSubmit }: EmbedUrlInputProps) => {
    const id = useId();
    const inputId = `${id}-embed-url`;
    const { t } = useTranslation();

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && url.trim() && !isLoading) {
          onSubmit();
        }
      },
      [url, isLoading, onSubmit],
    );

    return (
      <>
        <div className="flex flex-row space-x-1">
          <Label htmlFor={inputId}>{t('contentBuilder.editor.embed.url')}</Label>
          <QuestionTooltip>{t('contentBuilder.editor.embed.urlTooltip')}</QuestionTooltip>
        </div>
        <div className="flex gap-x-2">
          <Input
            variant="compact-surface"
            id={inputId}
            placeholder={t('contentBuilder.editor.embed.urlPlaceholder')}
            value={url}
            onChange={onUrlChange}
            onKeyDown={handleKeyDown}
            className="w-80"
            disabled={isLoading}
          />
          <Button
            className="flex-none w-20"
            variant="ghost"
            size="default"
            onClick={onSubmit}
            disabled={isLoading || !url.trim()}
          >
            <ArrowRightIcon className="mr-1" />
            {isLoading
              ? t('contentBuilder.editor.embed.loading')
              : t('contentBuilder.editor.embed.load')}
          </Button>
        </div>
      </>
    );
  },
);

EmbedUrlInput.displayName = 'EmbedUrlInput';
