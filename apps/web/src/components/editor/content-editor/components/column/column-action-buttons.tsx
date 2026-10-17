// Column-specific action buttons with sidebar popper for insert operations

import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/ui';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour/icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

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
  ({ onDelete, onAddLeft, onAddRight }: ColumnActionButtonsProps) => {
    const { t } = useTranslation();
    const entity = t('contentBuilder.editor.actionButtons.entity.column');
    return (
      <div className="flex items-center">
        <TooltipActionButton
          tooltip={t('contentBuilder.editor.actionButtons.delete', { entity })}
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
            <TooltipContent className="max-w-xs">
              {t('contentBuilder.editor.actionButtons.insertLeft', { entity })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex-none mx-1 leading-10">
          {t('contentBuilder.editor.actionButtons.insert', { entity })}
        </div>
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
            <TooltipContent className="max-w-xs">
              {t('contentBuilder.editor.actionButtons.insertRight', { entity })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  },
);

ColumnActionButtons.displayName = 'ColumnActionButtons';
