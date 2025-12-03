import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-packages/button';
import { DeleteIcon, UserIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { Attribute } from '@usertour/types';
import { ChangeEvent, MouseEvent, useCallback, useEffect, useState } from 'react';
import { Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useSlateStatic } from 'slate-react';
import { UserAttributeElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour/helpers';

export const UserAttributeElement = (props: RenderElementProps) => {
  const { zIndex, attributes } = usePopperEditorContext();
  const element = props.element as UserAttributeElementType;
  const editor = useSlateStatic();
  const [attrName, setAttrName] = useState<string>();
  const [fallback, setFallback] = useState<string>(element.fallback);
  const [open, setOpen] = useState<boolean>(false);

  const handleButtonActionChange = (attrCode: string) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      {
        attrCode,
      },
      { at: path },
    );
  };

  const handleButtonTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFallback(value);
  };

  useEffect(() => {
    if (attributes && attributes.length > 0 && element.attrCode) {
      const attr = attributes
        ?.filter((attr: Attribute) => attr.bizType === 1)
        ?.find((attr: Attribute) => attr.codeName === element.attrCode);
      if (attr) {
        setAttrName(attr.displayName);
      }
    }
  }, [attributes, element.attrCode]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (!open) {
        const path = ReactEditor.findPath(editor, element);
        Transforms.setNodes(
          editor,
          {
            fallback,
          },
          { at: path },
        );
      }
    },
    [fallback],
  );

  const handleDelete = () => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.removeNodes(editor, {
      at: path,
    });
  };

  const handleMouseDown = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setOpen(true);
  };

  const handleOnClick = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };

  const userAttributes = attributes?.filter((attr: Attribute) => attr.bizType === 1);

  return (
    <Popover.Root open={open} onOpenChange={handleOnOpenChange}>
      <Popover.Trigger onMouseDown={handleMouseDown} onClick={handleOnClick} asChild>
        <span
          {...props.attributes}
          className="cursor-pointer	bg-accent text-accent-foreground rounded text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 px-2 "
          contentEditable={false}
        >
          <UserIcon className="inline" height={15} width={15} />
          {attrName}
          {props.children}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none"
          side="bottom"
          align="start"
          style={{ zIndex: zIndex }}
          sideOffset={5}
          alignOffset={-2}
        >
          <div className="flex flex-col gap-2.5">
            <Select onValueChange={handleButtonActionChange} defaultValue={element.attrCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select a distribute" />
              </SelectTrigger>
              <SelectPortal style={{ zIndex: zIndex + 2 }}>
                <SelectContent>
                  <ScrollArea
                    className={cn(userAttributes && userAttributes?.length > 10 ? 'h-72' : '')}
                  >
                    {userAttributes?.map((attr: Attribute) => (
                      <SelectItem value={attr.codeName} key={attr.id}>
                        {attr.displayName}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </SelectPortal>
            </Select>
            <Label htmlFor="button-text">Fallback</Label>
            <Input
              type="button-text"
              className="bg-background"
              id="button-text"
              value={fallback}
              placeholder="Enter button text"
              onChange={handleButtonTextChange}
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
                  <p>Delete use attribute</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
UserAttributeElement.displayName = 'UserElement';

type TodoElementSerializeType = {
  className?: string;
  children: React.ReactNode;
  element: UserAttributeElementType;
};
export const UserAttributeElementSerialize = (props: TodoElementSerializeType) => {
  const { element } = props;
  return <span>{element.value}</span>;
};

UserAttributeElementSerialize.displayName = 'UserAttributeElementSerialize';
