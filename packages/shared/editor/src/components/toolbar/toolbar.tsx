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
import * as Popover from '@radix-ui/react-popover';
import * as Toolbar from '@radix-ui/react-toolbar';
import { cn } from '@usertour-packages/button/src/utils';
import { EDITOR_RICH_TOOLBAR, EDITOR_RICH_TOOLBAR_MORE } from '@usertour-packages/constants';
import {
  H1Icon,
  H2Icon,
  ListOrderIcon,
  ListUnOrderIcon,
  MoreIcon,
  UserIcon,
} from '@usertour-packages/icons';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useEvent, useMeasure } from 'react-use';
import { Editor, Element as SlateElement, Transforms } from 'slate';
import { useSlate } from 'slate-react';
import { inertUserAttributeBlock, insertLink, isLinkActive } from '../../lib/editorHelper';
import { getTextProps, toggleTextProps } from '../../lib/text';
import { CustomEditor } from '../../types/slate';
import { usePopperEditorContext } from '../editor';
import { ColorPicker } from './color-picker';

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

const toggleBlock = (editor: CustomEditor, format: any) => {
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
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    };
  }
  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const isBlockActive = (editor: CustomEditor, format: any, blockType = 'type') => {
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

const isMarkActive = (editor: CustomEditor, format: any) => {
  return getTextProps(editor, format);
};

interface ToggleItemBlockButtonProps {
  format: any;
  children: ReactNode;
  tips: string;
}
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

  const handleMouseDown = (event: any) => {
    event.preventDefault();
    if (format === 'user-attribute') {
      inertUserAttributeBlock(editor);
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

const MarkButton = ({
  format,
  Comp,
  tips = '',
}: {
  format: any;
  Comp: any;
  tips: string;
}) => {
  const editor = useSlate();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Comp
            className={isMarkActive(editor, format) ? '' : 'opacity-50'}
            onMouseDown={(event: any) => {
              event.preventDefault();
              toggleTextProps(editor, format);
            }}
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

  const itemMapping = [
    <ToolbarToggleItem value="bold" label="Bold" key={'bold'}>
      <MarkButton format="bold" Comp={FontBoldIcon} tips="Bold ⌘ B" />
    </ToolbarToggleItem>,
    <ToolbarToggleItem value="italic" label="Italic" key={'italic'}>
      <MarkButton format="italic" Comp={FontItalicIcon} tips="Italic ⌘ I" />
    </ToolbarToggleItem>,
    <ToolbarToggleItem value="underline" label="Underline" key={'underline'}>
      <MarkButton format="underline" Comp={UnderlineIcon} tips="Underline ⌘ U" />
    </ToolbarToggleItem>,
    <ToolbarToggleItem value="color" label="Color" key={'color'}>
      <ColorPicker container={ref.current} />
    </ToolbarToggleItem>,
    <ToggleItemBlockButton format="code" key={'code'} tips="Code ⌘ `">
      <CodeIcon />
    </ToggleItemBlockButton>,
    <ToggleItemBlockButton format="h1" key={'h1'} tips="H1">
      <H1Icon />
    </ToggleItemBlockButton>,
    <ToggleItemBlockButton format="h2" key={'h2'} tips="H2">
      <H2Icon />
    </ToggleItemBlockButton>,
    <ToggleItemBlockButton format="link" key={'link'} tips="Link">
      <Link1Icon height={15} width={15} />
    </ToggleItemBlockButton>,
    <ToggleItemBlockButton format="user-attribute" key={'user-attribute'} tips="User attribute">
      <UserIcon height={15} width={15} />
    </ToggleItemBlockButton>,
    <ToggleItemBlockButton format="numbered-list" key={'numbered-list'} tips="Numbered list">
      <ListOrderIcon />
    </ToggleItemBlockButton>,
    <ToggleItemBlockButton format="bulleted-list" key={'bulleted-list'} tips="Bulleted list">
      <ListUnOrderIcon />
    </ToggleItemBlockButton>,
  ];

  const alignItem = [
    <ToggleItemBlockButton format="left" key={'left'} tips="Align left">
      <TextAlignLeftIcon />
    </ToggleItemBlockButton>,
    <ToggleItemBlockButton format="center" key={'center'} tips="Align center">
      <TextAlignCenterIcon />
    </ToggleItemBlockButton>,
    <ToggleItemBlockButton format="right" key={'right'} tips="Align right">
      <TextAlignRightIcon />
    </ToggleItemBlockButton>,
  ];

  const [topItem, setTopItem] = useState<typeof itemMapping>(itemMapping);
  const [miniItem, setMiniItem] = useState<typeof itemMapping>([]);

  const [mref, rect] = useMeasure();
  const composedRefs = useComposedRefs(ref as any, mref as any);

  const onClick = useCallback(
    (event: MouseEvent) => {
      const isInToolbar = ref.current?.contains(event.target as any);
      const isInPopper = refPopper.current?.contains(event.target as any);
      const parentNode = ref.current?.parentNode;
      const isInEditor = parentNode ? parentNode.contains(event.target as any) : false;
      if (!isInToolbar && !isInPopper && !isInEditor) {
        setShowToolbar(false);
      }
    },
    [refPopper, ref],
  ) as any;
  useEvent('click', onClick, window, { capture: false });

  useEffect(() => {
    if (rect.width < 360) {
      const n = Math.max(Math.floor((rect.width - 10) / 27), 1);
      setTopItem(itemMapping.slice(0, n - 1));
      setMiniItem(itemMapping.slice(n - 1));
      setIsShowMore(true);
    } else {
      setTopItem(itemMapping);
      setIsShowMore(false);
    }
  }, [rect.width]);

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

      <Popover.Root>
        {isShowMore && (
          <Popover.Trigger
            className={cn(
              'flex-shrink-0 flex-grow-0 basis-auto text-mauve11 h-[25px] px-[5px] rounded inline-flex text-[13px] leading-none items-center justify-center ml-0.5 outline-none hover:bg-violet3 hover:text-violet11 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7 first:ml-0 data-[state=on]:bg-violet5 data-[state=on]:text-violet11',
            )}
          >
            <MoreIcon className="fill-black" />
          </Popover.Trigger>
        )}
        {/* <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Toolbar.Button
            className="px-[10px] text-white bg-primary flex-shrink-0 flex-grow-0 basis-auto h-[25px] rounded inline-flex text-[13px] leading-none items-center justify-center outline-none hover:bg-primary/90 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7"
            style={{ marginLeft: "auto" }}
          >
            <PlusIcon></PlusIcon>
            <TriangleDownIcon></TriangleDownIcon>
          </Toolbar.Button>
        </DropdownMenuTrigger>
        {showToolbar && (
          <DropdownMenuPortal container={ref.current}>
            <DropdownMenuContent className="w-56 z-[100010]" align="start">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    inertButtonBlock(editor);
                  }}
                >
                  <ButtonIcon className="mx-1" />
                  Button
                  <DropdownMenuShortcut>⌘⇧B</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={true}>
                  <QuestionIcon className="mx-1 fill-foreground" />
                  Question
                  <DropdownMenuShortcut>⌘⇧Q</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    inertImageBlock(editor);
                  }}
                >
                  <ImageIcon className="mx-1 fill-foreground" />
                  Image
                  <DropdownMenuShortcut>⌘⇧M</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    inertEmbedBlock(editor);
                  }}
                >
                  <VideoIcon className="mx-1 fill-foreground" />
                  Embed
                  <DropdownMenuShortcut>⌘⇧V</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    inertGroupBlock(editor);
                  }}
                >
                  <ColumnIcon className="mx-1 fill-foreground" />
                  Column
                  <DropdownMenuShortcut>⌘⇧C</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem disabled={true}>
                  <SquareIcon className="mx-1 fill-foreground" />
                  Container
                  <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        )}
      </DropdownMenu> */}
        <Popover.Portal>
          <Popover.Content
            ref={refPopper}
            sideOffset={10}
            side="bottom"
            style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR_MORE }}
          >
            <Toolbar.Root
              className={cn(
                'flex p-[5px] w-full min-w-max rounded-lg bg-[#f4f8fb] border-b-[#dfeaf1] border-b border-solid',
                isShowMore ? '' : 'hidden',
              )}
              // ref={ref}
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
            <Popover.Arrow className="fill-[#f4f8fb]" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

EditorToolbar.displayName = 'EditorToolbar';
