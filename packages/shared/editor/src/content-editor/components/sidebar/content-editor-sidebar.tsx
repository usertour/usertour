// Main sidebar component for adding content elements

import { PlusIcon3 } from '@usertour-packages/icons';
import { memo, useCallback, useMemo, useState } from 'react';

import type { ContentEditorElement, ContentEditorSideBarType } from '../../../types/editor';
import { getSidebarStyles } from '../../constants/sidebar';
import { ContentEditorSideBarPopper } from './content-editor-sidebar-popper';

export interface ContentEditorSideBarProps {
  onClick: (element: ContentEditorElement) => void;
  type: ContentEditorSideBarType;
  onPopoverOpenChange?: (open: boolean) => void;
}

export const ContentEditorSideBar = memo((props: ContentEditorSideBarProps) => {
  const { onClick, type, onPopoverOpenChange } = props;
  const [isHover, setHover] = useState(false);
  const [open, setOpen] = useState<boolean>(false);

  // Compute styles based on type and active state using useMemo
  const [iconStyle, lineStyle] = useMemo(
    () => getSidebarStyles(type, isHover || open),
    [type, isHover, open],
  );

  // Event handlers with useCallback
  const handleButtonClick = useCallback(
    (element: ContentEditorElement) => {
      onClick(element);
    },
    [onClick],
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

  return (
    <>
      <div style={lineStyle} />
      <ContentEditorSideBarPopper onClick={handleButtonClick} onOpenChange={handleOnOpenChange}>
        <PlusIcon3
          className="text-[#22c55e] h-5 w-5"
          style={iconStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={handleMouseOut}
        />
      </ContentEditorSideBarPopper>
    </>
  );
});

ContentEditorSideBar.displayName = 'ContentEditorSideBar';
