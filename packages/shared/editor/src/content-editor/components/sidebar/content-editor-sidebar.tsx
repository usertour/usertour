// Main sidebar component for adding content elements

import { Popover, PopoverAnchor } from '@usertour-packages/popover';
import { PlusIcon3 } from '@usertour-packages/icons';
import { memo, useCallback, useMemo, useState } from 'react';

import type { ContentEditorElement } from '../../../types/editor';
import { ContentEditorSideBarType } from '../../../types/editor';
import { getSidebarStyles } from '../../constants/sidebar';
import { cn } from '@usertour-packages/tailwind';
import { ContentTypeSelectorPopover } from './content-type-selector-popover';

export interface ContentEditorSideBarProps {
  onClick: (element: ContentEditorElement) => void;
  type: ContentEditorSideBarType;
  onPopoverOpenChange?: (open: boolean) => void;
  visible?: boolean;
}

export const ContentEditorSideBar = memo((props: ContentEditorSideBarProps) => {
  const { onClick, type, onPopoverOpenChange, visible = true } = props;
  const [isHover, setHover] = useState(false);
  const [open, setOpen] = useState<boolean>(false);

  // Compute styles based on type and active state using useMemo
  const [iconStyle, lineStyle] = useMemo(
    () => getSidebarStyles(type, isHover || open),
    [type, isHover, open],
  );

  // Handle popover close callback
  const handlePopoverClose = useCallback(() => {
    setOpen(false);
    onPopoverOpenChange?.(false);
  }, [onPopoverOpenChange]);

  // Handle button mouse down to toggle popover
  // Use onMouseDown instead of onClick to ensure event fires before mouse leaves
  const handleButtonMouseDown = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const newOpen = !open;
      setOpen(newOpen);
      onPopoverOpenChange?.(newOpen);
    },
    [open, onPopoverOpenChange],
  );

  const handleOnOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      onPopoverOpenChange?.(isOpen);
    },
    [onPopoverOpenChange],
  );

  const handleMouseOver = useCallback(() => {
    setHover(true);
  }, []);

  const handleMouseOut = useCallback(() => {
    setHover(false);
  }, []);

  const handleFocus = useCallback(() => {
    setHover(true);
  }, []);

  const handleBlur = useCallback(() => {
    setHover(false);
  }, []);

  const visibilityClasses = visible ? 'opacity-100 visible' : 'opacity-0 invisible';

  return (
    <Popover open={open} onOpenChange={handleOnOpenChange}>
      <div style={lineStyle} className={visibilityClasses} />
      <PopoverAnchor asChild>
        <button
          type="button"
          onMouseDown={handleButtonMouseDown}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn('size-5', visibilityClasses)}
          style={iconStyle}
        >
          <PlusIcon3 className="text-[#22c55e] h-full w-full" />
        </button>
      </PopoverAnchor>
      <ContentTypeSelectorPopover onClick={onClick} onClose={handlePopoverClose} />
    </Popover>
  );
});

ContentEditorSideBar.displayName = 'ContentEditorSideBar';
