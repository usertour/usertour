// Reusable link editor panel component

import type { Attribute } from '@usertour/types';
import { Button } from '@usertour-packages/button';
import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-packages/constants';
import { DeleteIcon } from '@usertour-packages/icons';
import { Tabs, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { memo } from 'react';
import type { Descendant } from 'slate';

import { PopperEditorMini } from '../../richtext-editor/editor';
import { LINK_OPEN_TYPE } from '../constants';

// Style constants
const TAB_TRIGGER_CLASS =
  'w-1/2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground';

// Component props types
interface DeleteLinkButtonProps {
  onDelete: () => void;
}

interface OpenTypeTabsProps {
  defaultValue: string;
  onValueChange: (value: string) => void;
}

export interface LinkEditorPanelProps {
  zIndex: number;
  attributes?: Attribute[];
  data: Descendant[];
  openType: string;
  onDataChange: (data: Descendant[]) => void;
  onOpenTypeChange: (value: string) => void;
  onDelete: () => void;
  hideDelete?: boolean;
}

/**
 * Delete link button with tooltip
 * Provides a button to remove link formatting from selected text
 */
const DeleteLinkButton = memo(({ onDelete }: DeleteLinkButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="flex-none hover:bg-destructive/20"
            variant="ghost"
            size="icon"
            onClick={onDelete}
          >
            <DeleteIcon className="fill-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>Remove link</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

DeleteLinkButton.displayName = 'DeleteLinkButton';

/**
 * Tabs for selecting link open behavior
 * Allows user to choose between opening link in same tab or new tab
 */
const OpenTypeTabs = memo(({ defaultValue, onValueChange }: OpenTypeTabsProps) => {
  return (
    <Tabs className="w-full" defaultValue={defaultValue} onValueChange={onValueChange}>
      <TabsList className="h-auto w-full">
        <TabsTrigger value={LINK_OPEN_TYPE.SAME} className={TAB_TRIGGER_CLASS}>
          Same tab
        </TabsTrigger>
        <TabsTrigger value={LINK_OPEN_TYPE.NEW} className={TAB_TRIGGER_CLASS}>
          New tab
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
});

OpenTypeTabs.displayName = 'OpenTypeTabs';

/**
 * Reusable link editor panel
 * Contains URL editor, delete button (optional), and open type tabs
 * Can be used in richtext link popover, image editor, or any other component that needs link editing
 */
export const LinkEditorPanel = memo(
  ({
    zIndex,
    attributes,
    data,
    openType,
    onDataChange,
    onOpenTypeChange,
    onDelete,
    hideDelete = false,
  }: LinkEditorPanelProps) => {
    const editorZIndex = zIndex + EDITOR_RICH_ACTION_CONTENT + 1;

    return (
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row space-x-1">
          <PopperEditorMini
            zIndex={editorZIndex}
            attributes={attributes}
            onValueChange={onDataChange}
            className="grow"
            initialValue={data}
          />
          {!hideDelete && <DeleteLinkButton onDelete={onDelete} />}
        </div>
        <OpenTypeTabs defaultValue={openType} onValueChange={onOpenTypeChange} />
      </div>
    );
  },
);

LinkEditorPanel.displayName = 'LinkEditorPanel';
