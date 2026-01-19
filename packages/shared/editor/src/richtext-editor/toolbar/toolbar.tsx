'use client';

import {
  CodeIcon,
  FontBoldIcon,
  FontItalicIcon,
  Link1Icon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  UnderlineIcon,
} from '@radix-ui/react-icons';
import * as Toolbar from '@radix-ui/react-toolbar';
import { EDITOR_RICH_TOOLBAR, EDITOR_RICH_TOOLBAR_MORE } from '@usertour-packages/constants';
import {
  H1Icon,
  H2Icon,
  ListOrderIcon,
  ListUnOrderIcon,
  MoreIcon,
  UserIcon,
} from '@usertour-packages/icons';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEvent, useMeasure } from 'react-use';
import { Editor, Element as SlateElement, Transforms } from 'slate';
import { useSlate } from 'slate-react';

import { insertUserAttributeBlock, insertLink, isLinkActive } from '../../lib/editorHelper';
import { getTextProps, toggleTextProps } from '../../lib/text';
import type { BlockFormat, CustomEditor, TextFormat } from '../../types/slate';
import { usePopperEditorContext } from '../editor';
import { ColorPicker } from './color-picker';

// Constants for list and alignment types
const LIST_TYPES: readonly string[] = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES: readonly string[] = ['left', 'center', 'right', 'justify'];

// Toolbar responsive layout constants
const TOOLBAR_RESPONSIVE_BREAKPOINT = 360; // Width threshold for showing "more" button
const TOOLBAR_CONTAINER_PADDING = 10; // Padding around toolbar items
const TOOLBAR_ITEM_WIDTH = 27; // Approximate width of each toolbar item

/**
 * Toggle block formatting (headings, lists, code, alignment)
 */
const toggleBlock = (editor: CustomEditor, format: BlockFormat) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type',
  );
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });

  let newProperties: Partial<SlateElement>;
  if (TEXT_ALIGN_TYPES.includes(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    };
  } else {
    // Type assertion is safe here - alignment types are excluded by the if branch above
    const elementType = isActive ? 'paragraph' : isList ? 'list-item' : format;
    newProperties = {
      type: elementType as SlateElement['type'],
    };
  }
  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    // Type assertion is safe here because isList ensures format is 'numbered-list' or 'bulleted-list'
    const block = { type: format as 'numbered-list' | 'bulleted-list', children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

/**
 * Check if a block format is currently active
 */
const isBlockActive = (editor: CustomEditor, format: BlockFormat, blockType = 'type'): boolean => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType as keyof typeof n] === format,
    }),
  );

  return !!match;
};

/**
 * Check if a text mark (bold, italic, etc.) is currently active
 */
const isMarkActive = (editor: CustomEditor, format: TextFormat): boolean => {
  return !!getTextProps(editor, format);
};

// Props interfaces
interface ToggleItemBlockButtonProps {
  format: BlockFormat;
  children: ReactNode;
  tips: string;
}

interface MarkButtonProps {
  format: TextFormat;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Comp: React.ComponentType<any>;
  tips: string;
}

/**
 * Button for toggling block-level formatting
 */
const ToggleItemBlockButton = ({ format, children, tips = '' }: ToggleItemBlockButtonProps) => {
  const editor = useSlate();
  let isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type',
  );

  if (format === 'link') {
    isActive = isLinkActive(editor);
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    if (format === 'user-attribute') {
      insertUserAttributeBlock(editor);
    } else if (format === 'link') {
      insertLink(editor, '');
    } else {
      toggleBlock(editor, format);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toolbar.ToggleItem
            className={cn(
              'flex-shrink-0 flex-grow-0 basis-auto text-mauve11 h-[25px] px-[5px] rounded inline-flex text-[13px] leading-none items-center justify-center ml-0.5 outline-none hover:bg-violet3 hover:text-violet11 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7 first:ml-0 data-[state=on]:bg-violet5 data-[state=on]:text-violet11 text-slate-900',
              isActive ? '' : 'opacity-50',
            )}
            value={format}
            aria-label={format}
            onMouseDown={handleMouseDown}
          >
            {children}
          </Toolbar.ToggleItem>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tips}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Button for toggling text marks (bold, italic, underline)
 */
const MarkButton = ({ format, Comp, tips = '' }: MarkButtonProps) => {
  const editor = useSlate();

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      toggleTextProps(editor, format);
    },
    [editor, format],
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Comp
            className={isMarkActive(editor, format) ? '' : 'opacity-50'}
            onMouseDown={handleMouseDown}
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tips || format}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ToolbarToggleItem = ({
  children,
  value,
  label,
}: {
  children: React.ReactNode;
  value: string;
  label: string;
}) => {
  return (
    <Toolbar.ToggleItem
      className="flex-shrink-0 flex-grow-0 basis-auto text-mauve11 h-[25px] px-[5px] rounded inline-flex text-[13px] leading-none items-center justify-center ml-0.5 outline-none hover:bg-violet3 hover:text-violet11 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7 first:ml-0 data-[state=on]:bg-violet5 data-[state=on]:text-violet11 text-slate-900"
      value={value}
      aria-label={label}
    >
      {children}
    </Toolbar.ToggleItem>
  );
};

export const EditorToolbar = () => {
  const ref = useRef<HTMLElement | null>(null);
  const refPopper = useRef<HTMLDivElement | null>(null);
  const { zIndex, setShowToolbar, showToolbar } = usePopperEditorContext();

  const [isShowMore, setIsShowMore] = useState(false);

  // Memoize toolbar items to prevent unnecessary re-renders and useEffect triggers
  const itemMapping = useMemo(
    () => [
      <ToolbarToggleItem value="bold" label="Bold" key="bold">
        <MarkButton format="bold" Comp={FontBoldIcon} tips="Bold ⌘ B" />
      </ToolbarToggleItem>,
      <ToolbarToggleItem value="italic" label="Italic" key="italic">
        <MarkButton format="italic" Comp={FontItalicIcon} tips="Italic ⌘ I" />
      </ToolbarToggleItem>,
      <ToolbarToggleItem value="underline" label="Underline" key="underline">
        <MarkButton format="underline" Comp={UnderlineIcon} tips="Underline ⌘ U" />
      </ToolbarToggleItem>,
      <ColorPicker key="color" />,
      <ToggleItemBlockButton format="code" key="code" tips="Code ⌘ `">
        <CodeIcon />
      </ToggleItemBlockButton>,
      <ToggleItemBlockButton format="h1" key="h1" tips="H1">
        <H1Icon />
      </ToggleItemBlockButton>,
      <ToggleItemBlockButton format="h2" key="h2" tips="H2">
        <H2Icon />
      </ToggleItemBlockButton>,
      <ToggleItemBlockButton format="link" key="link" tips="Link">
        <Link1Icon height={15} width={15} />
      </ToggleItemBlockButton>,
      <ToggleItemBlockButton format="user-attribute" key="user-attribute" tips="User attribute">
        <UserIcon height={15} width={15} />
      </ToggleItemBlockButton>,
      <ToggleItemBlockButton format="numbered-list" key="numbered-list" tips="Numbered list">
        <ListOrderIcon />
      </ToggleItemBlockButton>,
      <ToggleItemBlockButton format="bulleted-list" key="bulleted-list" tips="Bulleted list">
        <ListUnOrderIcon />
      </ToggleItemBlockButton>,
    ],
    [],
  );

  // Memoize alignment items
  const alignItem = useMemo(
    () => [
      <ToggleItemBlockButton format="left" key="left" tips="Align left">
        <TextAlignLeftIcon />
      </ToggleItemBlockButton>,
      <ToggleItemBlockButton format="center" key="center" tips="Align center">
        <TextAlignCenterIcon />
      </ToggleItemBlockButton>,
      <ToggleItemBlockButton format="right" key="right" tips="Align right">
        <TextAlignRightIcon />
      </ToggleItemBlockButton>,
    ],
    [],
  );

  const [topItem, setTopItem] = useState<React.ReactElement[]>([]);
  const [miniItem, setMiniItem] = useState<React.ReactElement[]>([]);

  const [mref, rect] = useMeasure();
  const composedRefs = useComposedRefs(ref as any, mref as any);

  const handleClickOutside = useCallback(
    (event: Event) => {
      const mouseEvent = event as MouseEvent;
      const isInToolbar = ref.current?.contains(mouseEvent.target as Node);
      const isInPopper = refPopper.current?.contains(mouseEvent.target as Node);
      const parentNode = ref.current?.parentNode;
      const isInEditor = parentNode ? parentNode.contains(mouseEvent.target as Node) : false;
      // Check if click is inside any Radix Popover (e.g., ColorPicker panel)
      const isInRadixPopover = (mouseEvent.target as Element).closest?.(
        '[data-radix-popper-content-wrapper]',
      );
      if (!isInToolbar && !isInPopper && !isInEditor && !isInRadixPopover) {
        setShowToolbar(false);
      }
    },
    [setShowToolbar],
  );
  useEvent('click', handleClickOutside, window, { capture: false });

  // Responsive toolbar: show "more" button when width is below threshold
  useEffect(() => {
    if (rect.width < TOOLBAR_RESPONSIVE_BREAKPOINT) {
      const visibleItemCount = Math.max(
        Math.floor((rect.width - TOOLBAR_CONTAINER_PADDING) / TOOLBAR_ITEM_WIDTH),
        1,
      );
      setTopItem(itemMapping.slice(0, visibleItemCount - 1));
      setMiniItem(itemMapping.slice(visibleItemCount - 1));
      setIsShowMore(true);
    } else {
      setTopItem(itemMapping);
      setMiniItem([]);
      setIsShowMore(false);
    }
  }, [rect.width, itemMapping]);

  return (
    <div
      className={cn(
        'fixed -top-8 left-0 flex p-[10px] w-full min-w-max rounded-t-lg bg-editor-toolbar border-b-editor-border border-b border-solid h-10	',
        showToolbar ? '' : 'hidden',
      )}
      ref={composedRefs}
      style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR }}
    >
      <Toolbar.Root
        // style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR }}
        aria-label="Formatting options"
        className="flex flex-row"
      >
        <Toolbar.ToggleGroup type="multiple" aria-label="Text formatting">
          {...topItem}
        </Toolbar.ToggleGroup>
        {!isShowMore && (
          <>
            <Toolbar.Separator className="w-[1px] bg-primary/30 mx-[10px] my-[3px]" />
            <Toolbar.ToggleGroup type="single" defaultValue="center" aria-label="Text alignment">
              {...alignItem}
            </Toolbar.ToggleGroup>
          </>
        )}
        {/* <Toolbar.Separator className="w-[1px] bg-mauve6 mx-[10px]" /> */}
      </Toolbar.Root>

      <Popover>
        {isShowMore && (
          <PopoverTrigger
            className={cn(
              'flex-shrink-0 flex-grow-0 basis-auto text-mauve11 h-[25px] px-[5px] rounded inline-flex text-[13px] leading-none items-center justify-center ml-0.5 outline-none hover:bg-violet3 hover:text-violet11 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7 first:ml-0 data-[state=on]:bg-violet5 data-[state=on]:text-violet11',
            )}
          >
            <MoreIcon className="fill-black" />
          </PopoverTrigger>
        )}
        <PopoverContent
          ref={refPopper}
          sideOffset={10}
          side="bottom"
          className="p-0 border-none bg-transparent shadow-none"
          style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR_MORE }}
        >
          <Toolbar.Root
            className={cn(
              'flex p-[5px] w-full min-w-max rounded-lg bg-[#f4f8fb] border-b-[#dfeaf1] border-b border-solid',
              isShowMore ? '' : 'hidden',
            )}
            style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR }}
            aria-label="Formatting options"
          >
            {miniItem.length > 0 && (
              <>
                <Toolbar.ToggleGroup
                  type="single"
                  defaultValue="center"
                  aria-label="Text alignment"
                >
                  {...miniItem}
                </Toolbar.ToggleGroup>
                <Toolbar.Separator className="w-[1px] bg-primary/30 mx-[10px] my-[3px]" />
              </>
            )}
            <Toolbar.ToggleGroup type="single" defaultValue="center" aria-label="Text alignment">
              {...alignItem}
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
          <PopoverArrow className="fill-[#f4f8fb]" />
        </PopoverContent>
      </Popover>
    </div>
  );
};

EditorToolbar.displayName = 'EditorToolbar';
