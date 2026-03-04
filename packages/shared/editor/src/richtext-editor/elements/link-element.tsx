import type { MouseEvent, ReactNode } from 'react';
import { memo, useCallback, useState } from 'react';
import type { Descendant } from 'slate';
import { Transforms } from 'slate';
import type { RenderElementProps } from 'slate-react';
import { ReactEditor, useSlateStatic } from 'slate-react';

import type { Attribute } from '@usertour/types';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { Link, getLinkClassName } from '@usertour-packages/widget';

import { INITIAL_LINK_URL_VALUE, LINK_OPEN_TYPE } from '../../content-editor/constants';
import { LinkEditorPanel } from '../../content-editor/shared';
import type { LinkElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';

// Component props types
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
 * Popover content for editing link properties in richtext
 * Uses the shared LinkEditorPanel component
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
    return (
      <PopoverContent
        className="w-80"
        side="bottom"
        align="start"
        style={{ zIndex }}
        sideOffset={5}
        alignOffset={-2}
      >
        <LinkEditorPanel
          zIndex={zIndex}
          attributes={attributes}
          data={data}
          openType={openType}
          onDataChange={onDataChange}
          onOpenTypeChange={onOpenTypeChange}
          onDelete={onDelete}
        />
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
  const [data, setData] = useState<Descendant[]>(element.data ?? INITIAL_LINK_URL_VALUE);
  const [openType, setOpenType] = useState<string>(element.openType ?? LINK_OPEN_TYPE.SAME);

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
  const isNewTab = element.openType === LINK_OPEN_TYPE.NEW;

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
