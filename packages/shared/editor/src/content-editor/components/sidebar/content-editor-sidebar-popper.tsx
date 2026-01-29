// Sidebar popper component for adding new content elements

import { Popover, PopoverTrigger } from '@usertour-packages/popover';
import type { PopoverProps } from '@usertour-packages/popover';
import { memo } from 'react';

import type { ContentEditorElement } from '../../../types/editor';
import { ContentTypeSelectorPopover } from './content-type-selector-popover';

export interface ContentEditorSideBarPopperProps extends PopoverProps {
  onClick: (element: ContentEditorElement) => void;
}

export const ContentEditorSideBarPopper = memo(
  ({ onClick, children, ...popoverProps }: ContentEditorSideBarPopperProps) => {
    return (
      <Popover {...popoverProps}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <ContentTypeSelectorPopover onClick={onClick} />
      </Popover>
    );
  },
);

ContentEditorSideBarPopper.displayName = 'ContentEditorSideBarPopper';
