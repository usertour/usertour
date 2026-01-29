// Image-specific action buttons with replace functionality

import { Button } from '@usertour-packages/button';
import { ImageEditIcon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import Upload from 'rc-upload';
import { memo, useCallback } from 'react';

import type { ContentEditorUploadRequestOption } from '../../../types/editor';
import { ActionButtonsBase } from '../../shared';

export interface ImageActionButtonsProps {
  onDelete: () => void;
  onReplace: (option: ContentEditorUploadRequestOption) => Promise<void>;
  onAddLeft: () => void;
  onAddRight: () => void;
  isLoading: boolean;
}

export const ImageActionButtons = memo(
  ({ onDelete, onReplace, onAddLeft, onAddRight, isLoading }: ImageActionButtonsProps) => {
    const handleReplace = useCallback(
      (option: unknown) => {
        onReplace(option as ContentEditorUploadRequestOption);
      },
      [onReplace],
    );

    // Render the replace image button as middle action
    const renderReplaceButton = useCallback(
      () => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="flex-none" variant="ghost" size="icon" disabled={isLoading}>
                <Upload accept="image/*" customRequest={handleReplace}>
                  <ImageEditIcon className="mx-1 fill-foreground" />
                </Upload>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">Replace image</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      [handleReplace, isLoading],
    );

    return (
      <ActionButtonsBase
        entityName="image"
        onDelete={onDelete}
        onAddLeft={onAddLeft}
        onAddRight={onAddRight}
        disabled={isLoading}
        renderMiddleActions={renderReplaceButton}
      />
    );
  },
);

ImageActionButtons.displayName = 'ImageActionButtons';
