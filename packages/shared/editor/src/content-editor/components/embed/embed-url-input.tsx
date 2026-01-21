// Embed URL input component with load button

import { Button } from '@usertour-packages/button';
import { ArrowRightIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { memo, useCallback, useId } from 'react';

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
          <Label htmlFor={inputId}>Embed URL</Label>
          <QuestionTooltip>
            Enter the URL of any content you want to embed. This could be a YouTube video, a form,
            documentation, a website, or even a direct link to a video file. We support most
            embeddable content from the web.
          </QuestionTooltip>
        </div>
        <div className="flex gap-x-2">
          <Input
            id={inputId}
            placeholder="Enter URL"
            value={url}
            onChange={onUrlChange}
            onKeyDown={handleKeyDown}
            className="bg-background w-80"
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
            {isLoading ? 'Loading...' : 'Load'}
          </Button>
        </div>
      </>
    );
  },
);

EmbedUrlInput.displayName = 'EmbedUrlInput';
