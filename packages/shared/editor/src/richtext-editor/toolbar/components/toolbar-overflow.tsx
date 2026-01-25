'use client';

import {
  Root as ToolbarRoot,
  Separator as ToolbarSeparator,
  ToggleGroup as ToolbarToggleGroup,
} from '@radix-ui/react-toolbar';
import { EDITOR_RICH_TOOLBAR, EDITOR_RICH_TOOLBAR_MORE } from '@usertour-packages/constants';
import { MoreIcon } from '@usertour-packages/icons';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import { forwardRef, memo, useState } from 'react';

import {
  TOOLBAR_BUTTON_ACTIVE,
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_INACTIVE,
  TOOLBAR_OVERFLOW_CONTENT,
  TOOLBAR_SEPARATOR,
  TOOLBAR_TOGGLE_GROUP,
} from '../toolbar.styles';
import type {
  AlignmentItemConfig,
  BlockToolbarItemConfig,
  ColorToolbarItemConfig,
  LinkToolbarItemConfig,
  MarkToolbarItemConfig,
  ToolbarItemConfig,
  UserAttributeToolbarItemConfig,
} from '../toolbar.types';
import { AlignmentGroup } from './alignment-group';
import { BlockButton } from './block-button';
import { ColorButton } from './color-button';
import { LinkButton } from './link-button';
import { MarkButton } from './mark-button';
import { UserAttrButton } from './user-attr-button';

interface ToolbarOverflowProps {
  items: ToolbarItemConfig[];
  alignmentItems: AlignmentItemConfig[];
  zIndex: number;
}

/**
 * Render toolbar item based on its type
 */
const renderToolbarItem = (item: ToolbarItemConfig) => {
  switch (item.type) {
    case 'mark':
      return <MarkButton key={item.id} config={item as MarkToolbarItemConfig} />;
    case 'block':
      return <BlockButton key={item.id} config={item as BlockToolbarItemConfig} />;
    case 'link':
      return <LinkButton key={item.id} config={item as LinkToolbarItemConfig} />;
    case 'user-attribute':
      return <UserAttrButton key={item.id} config={item as UserAttributeToolbarItemConfig} />;
    case 'color':
      return <ColorButton key={item.id} config={item as ColorToolbarItemConfig} />;
    default:
      return null;
  }
};

/**
 * Overflow menu for responsive toolbar
 * Shows remaining items when toolbar is too narrow
 */
export const ToolbarOverflow = memo(
  forwardRef<HTMLDivElement, ToolbarOverflowProps>(({ items, alignmentItems, zIndex }, ref) => {
    const [open, setOpen] = useState(false);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            TOOLBAR_BUTTON_BASE,
            open ? TOOLBAR_BUTTON_ACTIVE : TOOLBAR_BUTTON_INACTIVE,
          )}
        >
          <MoreIcon className="fill-current" />
        </PopoverTrigger>
        <PopoverContent
          ref={ref}
          withoutPortal={true}
          sideOffset={10}
          side="bottom"
          className="p-0 border-none bg-transparent shadow-none"
          style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR_MORE }}
        >
          <ToolbarRoot
            className={TOOLBAR_OVERFLOW_CONTENT}
            style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR }}
            aria-label="Additional formatting options"
          >
            {items.length > 0 && (
              <>
                <ToolbarToggleGroup
                  type="multiple"
                  aria-label="Additional formatting"
                  className={TOOLBAR_TOGGLE_GROUP}
                >
                  {items.map(renderToolbarItem)}
                </ToolbarToggleGroup>
                <ToolbarSeparator className={TOOLBAR_SEPARATOR} />
              </>
            )}
            <AlignmentGroup items={alignmentItems} />
          </ToolbarRoot>
          <PopoverArrow className="fill-editor-toolbar" width={10} height={5} />
        </PopoverContent>
      </Popover>
    );
  }),
);

ToolbarOverflow.displayName = 'ToolbarOverflow';
