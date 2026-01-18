import type { ReactNode } from 'react';
import { memo, useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Descendant } from 'slate';
import { Transforms } from 'slate';
import type { RenderElementProps } from 'slate-react';
import { ReactEditor, useSlateStatic } from 'slate-react';

import * as Popover from '@radix-ui/react-popover';
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
import { Link, getLinkClassName } from '@usertour-packages/widget';

import type { LinkElementType } from '../../types/slate';
import { PopperEditorMini, serializeMini, usePopperEditorContext } from '../editor';

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'https://' }],
  },
];

/**
 * Link element for Slate editor
 * Renders link with popover for editing URL and open type
 */
export const LinkElement = (props: RenderElementProps) => {
  const { zIndex, attributes } = usePopperEditorContext();
  const element = props.element as LinkElementType;
  const editor = useSlateStatic();
  const [open, setOpen] = useState<boolean>(false);
  const [data, setData] = useState(element.data ?? initialValue);
  const [openType, setOpenType] = useState(element.openType || 'same');

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        return;
      }
      const path = ReactEditor.findPath(editor, element);
      Transforms.setNodes(
        editor,
        {
          openType,
          data,
          url: data ? data.map((v) => serializeMini(v)).join() : undefined,
        },
        { at: path },
      );
    },
    [editor, element, openType, data],
  );

  const handleDelete = useCallback(() => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.unwrapNodes(editor, {
      at: path,
    });
  }, [editor, element]);

  const handleMouseDown = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setOpen(true);
  };

  const handleOnClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOnOpenChange}>
      <Popover.Trigger onMouseDown={handleMouseDown} onClick={handleOnClick} asChild>
        <span {...props.attributes} className={getLinkClassName()}>
          {props.children}
        </span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-80 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none"
          side="bottom"
          align="start"
          style={{ zIndex: zIndex }}
          sideOffset={5}
          alignOffset={-2}
        >
          <div className="flex flex-col space-y-2">
            <div className="flex flex-row space-x-1">
              <PopperEditorMini
                zIndex={zIndex + EDITOR_RICH_ACTION_CONTENT + 1}
                attributes={attributes}
                onValueChange={setData}
                className="grow"
                initialValue={data}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="flex-none hover:bg-red-200"
                      variant="ghost"
                      size="icon"
                      onClick={handleDelete}
                    >
                      <DeleteIcon className="fill-red-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Remove link</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Tabs className="w-full" defaultValue={openType} onValueChange={setOpenType}>
              <TabsList className="h-auto w-full">
                <TabsTrigger
                  value="same"
                  className="w-1/2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Same tab
                </TabsTrigger>
                <TabsTrigger
                  value="new"
                  className="w-1/2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  New tab
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

LinkElement.displayName = 'LinkElement';

// Component props types
interface LinkElementSerializeProps {
  children: ReactNode;
  element: LinkElementType;
}

/**
 * Link element for serialized/rendered output in SDK
 * Uses the widget Link component for consistent styling
 * Note: SDK content is rendered inside an iframe, so we need to use _parent for same tab
 */
export const LinkElementSerialize = memo((props: LinkElementSerializeProps) => {
  const { element, children } = props;
  const isNewTab = element.openType === 'new';

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
