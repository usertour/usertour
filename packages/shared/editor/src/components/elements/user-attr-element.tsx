import type { ChangeEvent, MouseEvent, ReactNode } from 'react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Transforms } from 'slate';
import type { RenderElementProps } from 'slate-react';
import { ReactEditor, useSlateStatic } from 'slate-react';

import type { Attribute } from '@usertour/types';
import { Button } from '@usertour-packages/button';
import { ComboBox } from '@usertour-packages/combo-box';
import { DeleteIcon, UserIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

import type { UserAttributeElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';

// Constants
const USER_ATTR_BIZ_TYPE = 1;

// Style constants - inline badge with hover and focus styles (aligned with button base)
const USER_ATTR_TRIGGER_BASE_CLASS =
  'inline-flex items-center gap-1 cursor-pointer border bg-accent text-accent-foreground rounded-md text-sm font-medium ring-offset-background transition-all outline-none hover:bg-accent/80 px-2';
const USER_ATTR_TRIGGER_FOCUS_CLASS = 'border-ring ring-ring/50 ring-[3px]';

// Component props types
interface DeleteUserAttrButtonProps {
  onDelete: () => void;
}

interface UserAttrOption {
  value: string;
  name: string;
}

interface UserAttrPopoverContentProps {
  zIndex: number;
  options: UserAttrOption[];
  attrCode?: string;
  fallback: string;
  onAttrChange: (attrCode: string) => void;
  onFallbackChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void;
}

interface UserAttributeElementSerializeProps {
  className?: string;
  children: ReactNode;
  element: UserAttributeElementType;
}

/**
 * Delete user attribute button with tooltip
 * Provides a button to remove user attribute element
 */
const DeleteUserAttrButton = memo(({ onDelete }: DeleteUserAttrButtonProps) => {
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
          <p>Delete user attribute</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

DeleteUserAttrButton.displayName = 'DeleteUserAttrButton';

/**
 * Popover content for editing user attribute
 * Contains attribute selector, fallback input, and delete button
 */
const UserAttrPopoverContent = memo(
  ({
    zIndex,
    options,
    attrCode,
    fallback,
    onAttrChange,
    onFallbackChange,
    onDelete,
  }: UserAttrPopoverContentProps) => {
    return (
      <PopoverContent
        className="w-72"
        side="bottom"
        align="start"
        style={{ zIndex }}
        sideOffset={5}
        alignOffset={-2}
      >
        <div className="flex flex-col gap-2.5">
          <ComboBox
            options={options}
            value={attrCode}
            onValueChange={onAttrChange}
            placeholder="Select an attribute"
            contentStyle={{ zIndex: zIndex + 2 }}
          />
          <Label htmlFor="fallback-text">Fallback</Label>
          <Input
            type="text"
            className="bg-background"
            id="fallback-text"
            value={fallback}
            placeholder="Enter fallback text"
            onChange={onFallbackChange}
          />
          <DeleteUserAttrButton onDelete={onDelete} />
        </div>
      </PopoverContent>
    );
  },
);

UserAttrPopoverContent.displayName = 'UserAttrPopoverContent';

/**
 * User attribute element for Slate editor
 * Renders user attribute placeholder with popover for editing
 */
export const UserAttributeElement = memo((props: RenderElementProps) => {
  const { attributes, children } = props;
  const element = props.element as UserAttributeElementType;
  const { zIndex, attributes: editorAttributes } = usePopperEditorContext();
  const editor = useSlateStatic();

  const [attrName, setAttrName] = useState<string>();
  const [fallback, setFallback] = useState<string>(element.fallback ?? '');
  const [open, setOpen] = useState(false);

  // Filter user attributes and create options
  const userAttributeOptions = useMemo(() => {
    return (
      editorAttributes
        ?.filter((attr: Attribute) => attr.bizType === USER_ATTR_BIZ_TYPE)
        ?.map((attr: Attribute) => ({
          value: attr.codeName,
          name: attr.displayName,
        })) ?? []
    );
  }, [editorAttributes]);

  // Update attribute name when attributes or attrCode changes
  useEffect(() => {
    if (editorAttributes && editorAttributes.length > 0 && element.attrCode) {
      const attr = editorAttributes
        ?.filter((attr: Attribute) => attr.bizType === USER_ATTR_BIZ_TYPE)
        ?.find((attr: Attribute) => attr.codeName === element.attrCode);
      if (attr) {
        setAttrName(attr.displayName);
      }
    }
  }, [editorAttributes, element.attrCode]);

  // Handle attribute selection change
  const handleAttrChange = useCallback(
    (attrCode: string) => {
      const path = ReactEditor.findPath(editor, element);
      Transforms.setNodes(editor, { attrCode }, { at: path });
    },
    [editor, element],
  );

  // Handle fallback text change
  const handleFallbackChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFallback(e.target.value);
  }, []);

  // Handle popover open/close and save fallback on close
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        return;
      }

      const path = ReactEditor.findPath(editor, element);
      Transforms.setNodes(editor, { fallback }, { at: path });
    },
    [editor, element, fallback],
  );

  // Handle element deletion
  const handleDelete = useCallback(() => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.removeNodes(editor, { at: path });
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
        <span
          {...attributes}
          className={cn(USER_ATTR_TRIGGER_BASE_CLASS, open && USER_ATTR_TRIGGER_FOCUS_CLASS)}
          contentEditable={false}
        >
          <UserIcon height={15} width={15} />
          {attrName ?? '...'}
          {children}
        </span>
      </PopoverTrigger>
      <UserAttrPopoverContent
        zIndex={zIndex}
        options={userAttributeOptions}
        attrCode={element.attrCode}
        fallback={fallback}
        onAttrChange={handleAttrChange}
        onFallbackChange={handleFallbackChange}
        onDelete={handleDelete}
      />
    </Popover>
  );
});

UserAttributeElement.displayName = 'UserAttributeElement';

/**
 * User attribute element for serialized/rendered output in SDK
 * Renders user attribute value as plain text inline with surrounding content
 */
export const UserAttributeElementSerialize = memo(
  ({ element }: UserAttributeElementSerializeProps) => {
    return <span>{element.value}</span>;
  },
);

UserAttributeElementSerialize.displayName = 'UserAttributeElementSerialize';
