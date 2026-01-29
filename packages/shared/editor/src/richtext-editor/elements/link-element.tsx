import type { MouseEvent, ReactNode } from 'react';
import { memo, useCallback, useState } from 'react';
import type { Descendant } from 'slate';
import { Transforms } from 'slate';
import type { RenderElementProps } from 'slate-react';
import { ReactEditor, useSlateStatic } from 'slate-react';

import type { Attribute } from '@usertour/types';
import { Button } from '@usertour-packages/button';
import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-packages/constants';
import { DeleteIcon } from '@usertour-packages/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { Tabs, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { Link, getLinkClassName } from '@usertour-packages/widget';

import type { LinkElementType } from '../../types/slate';
import { PopperEditorMini, usePopperEditorContext } from '../editor';

// Constants
const INITIAL_URL_VALUE: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'https://' }],
  },
];

const OPEN_TYPE = {
  SAME: 'same',
  NEW: 'new',
} as const;

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

interface LinkPopoverContentProps {
  zIndex: number;
  attributes?: Attribute[];
  data: Descendant[];
  openType: string;
  onDataChange: (data: Descendant[]) => void;
  onOpenTypeChange: (value: string) => void;
  onDelete: () => void;
}

interface LinkElementSerializeProps {
  children: ReactNode;
  element: LinkElementType;
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
        <TabsTrigger value={OPEN_TYPE.SAME} className={TAB_TRIGGER_CLASS}>
          Same tab
        </TabsTrigger>
        <TabsTrigger value={OPEN_TYPE.NEW} className={TAB_TRIGGER_CLASS}>
          New tab
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
});

OpenTypeTabs.displayName = 'OpenTypeTabs';

/**
 * Popover content for editing link properties
 * Contains URL editor, delete button, and open type tabs
 */
const LinkPopoverContent = memo(
  ({
    zIndex,
    attributes,
    data,
    openType,
    onDataChange,
    onOpenTypeChange,
    onDelete,
  }: LinkPopoverContentProps) => {
    const editorZIndex = zIndex + EDITOR_RICH_ACTION_CONTENT + 1;

    return (
      <PopoverContent
        className="w-80"
        side="bottom"
        align="start"
        style={{ zIndex }}
        sideOffset={5}
        alignOffset={-2}
      >
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row space-x-1">
            <PopperEditorMini
              zIndex={editorZIndex}
              attributes={attributes}
              onValueChange={onDataChange}
              className="grow"
              initialValue={data}
            />
            <DeleteLinkButton onDelete={onDelete} />
          </div>
          <OpenTypeTabs defaultValue={openType} onValueChange={onOpenTypeChange} />
        </div>
      </PopoverContent>
    );
  },
);

LinkPopoverContent.displayName = 'LinkPopoverContent';

/**
 * Link element for Slate editor
 * Renders link with popover for editing URL and open type
 */
export const LinkElement = memo((props: RenderElementProps) => {
  const { attributes, children } = props;
  const element = props.element as LinkElementType;
  const { zIndex, attributes: editorAttributes } = usePopperEditorContext();
  const editor = useSlateStatic();

  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Descendant[]>(element.data ?? INITIAL_URL_VALUE);
  const [openType, setOpenType] = useState<string>(element.openType ?? OPEN_TYPE.SAME);

  // Handle popover open/close and save changes on close
  // Note: url field is not saved here as SDK will regenerate it from data field
  // using extractLinkUrl() which correctly handles user attributes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        return;
      }

      const path = ReactEditor.findPath(editor, element);
      Transforms.setNodes(
        editor,
        {
          openType,
          data,
        },
        { at: path },
      );
    },
    [editor, element, openType, data],
  );

  // Handle link deletion (unwrap link nodes)
  const handleDelete = useCallback(() => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.unwrapNodes(editor, { at: path });
  }, [editor, element]);

  // Prevent default behavior and open popover
  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setOpen(true);
  }, []);

  // Prevent click event from bubbling
  const handleClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger onMouseDown={handleMouseDown} onClick={handleClick} asChild>
        <span {...attributes} className={getLinkClassName()}>
          {children}
        </span>
      </PopoverTrigger>
      <LinkPopoverContent
        zIndex={zIndex}
        attributes={editorAttributes}
        data={data}
        openType={openType}
        onDataChange={setData}
        onOpenTypeChange={setOpenType}
        onDelete={handleDelete}
      />
    </Popover>
  );
});

LinkElement.displayName = 'LinkElement';

/**
 * Link element for serialized/rendered output in SDK
 * Uses the widget Link component for consistent styling
 * Note: SDK content is rendered inside an iframe, so we need to use _parent for same tab
 */
export const LinkElementSerialize = memo(({ element, children }: LinkElementSerializeProps) => {
  const isNewTab = element.openType === OPEN_TYPE.NEW;

  return (
    <Link
      href={element.url}
      target={isNewTab ? '_blank' : '_parent'}
      rel={isNewTab ? 'noreferrer' : undefined}
    >
      {children}
    </Link>
  );
});

LinkElementSerialize.displayName = 'LinkElementSerialize';
