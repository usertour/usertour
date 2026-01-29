// Column-specific action buttons with sidebar popper for insert operations

import { Button } from '@usertour-packages/button';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { memo } from 'react';

import type { ContentEditorElement } from '../../../types/editor';
import { TooltipActionButton } from '../../shared';
import { ContentEditorSideBarPopper } from '../sidebar';

export interface ColumnActionButtonsProps {
  onDelete: () => void;
  onAddLeft: (element: ContentEditorElement) => void;
  onAddRight: (element: ContentEditorElement) => void;
}

/**
 * Column-specific action buttons component
 * Uses ContentEditorSideBarPopper for insert operations to show element picker
 */
export const ColumnActionButtons = memo(
  ({ onDelete, onAddLeft, onAddRight }: ColumnActionButtonsProps) => (
    <div className="flex items-center">
      <TooltipActionButton
        tooltip="Delete column"
        icon={<DeleteIcon className="fill-destructive" />}
        onClick={onDelete}
        destructive
      />
      <div className="grow" />
      {/* Insert left button with sidebar popper */}
      <TooltipProvider>
        <Tooltip>
          <ContentEditorSideBarPopper onClick={onAddLeft}>
            <TooltipTrigger asChild>
              <Button className="flex-none" variant="ghost" size="icon">
                <InsertColumnLeftIcon className="fill-foreground" />
              </Button>
            </TooltipTrigger>
          </ContentEditorSideBarPopper>
          <TooltipContent className="max-w-xs">Insert column to the left</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex-none mx-1 leading-10">Insert column</div>
      {/* Insert right button with sidebar popper */}
      <TooltipProvider>
        <Tooltip>
          <ContentEditorSideBarPopper onClick={onAddRight}>
            <TooltipTrigger asChild>
              <Button className="flex-none" variant="ghost" size="icon">
                <InsertColumnRightIcon className="fill-foreground" />
              </Button>
            </TooltipTrigger>
          </ContentEditorSideBarPopper>
          <TooltipContent className="max-w-xs">Insert column to the right</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  ),
);

ColumnActionButtons.displayName = 'ColumnActionButtons';
