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
import { MouseEvent, useCallback, useState } from 'react';
import { Descendant, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useSlateStatic } from 'slate-react';
import { LinkElementType } from '../../types/slate';
import { PopperEditorMini, serializeMini, usePopperEditorContext } from '../editor';

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'https://' }],
  },
];
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
        <span
          {...props.attributes}
          className="underline"
          style={{ color: 'hsl(var(--usertour-link-color))' }}
        >
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
          <div className=" flex flex-col space-y-2">
            <div className=" flex flex-row space-x-1">
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
              <TabsList className="h-auto w-full	">
                <TabsTrigger
                  value="same"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground w-1/2"
                >
                  Same tab
                </TabsTrigger>
                <TabsTrigger
                  value="new"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground w-1/2"
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

type LinkElementSerializeType = {
  children: React.ReactNode;
  element: LinkElementType;
};

export const LinkElementSerialize = (props: LinkElementSerializeType) => {
  const { element, children } = props;
  return (
    <a href={element.url} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
};

LinkElementSerialize.displayName = 'LinkElementSerialize';
