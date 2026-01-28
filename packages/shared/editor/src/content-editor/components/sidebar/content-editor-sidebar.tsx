// Main sidebar component for adding content elements

import { EDITOR_SIDEBAR } from '@usertour-packages/constants';
import { Popover, PopoverAnchor, PopoverContent } from '@usertour-packages/popover';
import { PlusIcon3 } from '@usertour-packages/icons';
import { cuid, isQuestionElement } from '@usertour/helpers';
import { memo, useCallback, useMemo, useState } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';
import type { ContentEditorElement, ContentEditorQuestionElement } from '../../../types/editor';
import { ContentEditorSideBarType } from '../../../types/editor';
import { getSidebarStyles } from '../../constants/sidebar';
import { contentTypesConfig } from '../../../utils/config';
import { cn } from '@usertour-packages/tailwind';

// Grid item component for content type selection
interface ContentTypeGridItemProps {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

const ContentTypeGridItem = memo(({ name, icon: Icon, onClick }: ContentTypeGridItemProps) => (
  <div
    onClick={onClick}
    className="rounded-lg text-sm flex flex-col border hover:shadow-lg dark:hover:shadow-lg-light cursor-pointer p-4 items-center justify-center pb-2"
  >
    <Icon className="h-6 w-6 text-primary" />
    {name}
  </div>
));

ContentTypeGridItem.displayName = 'ContentTypeGridItem';

export interface ContentEditorSideBarProps {
  onClick: (element: ContentEditorElement) => void;
  type: ContentEditorSideBarType;
  onPopoverOpenChange?: (open: boolean) => void;
  visible?: boolean;
}

export const ContentEditorSideBar = memo((props: ContentEditorSideBarProps) => {
  const { onClick, type, onPopoverOpenChange, visible = true } = props;
  const { zIndex, enabledElementTypes } = useContentEditorContext();
  const [isHover, setHover] = useState(false);
  const [open, setOpen] = useState<boolean>(false);

  // Compute styles based on type and active state using useMemo
  const [iconStyle, lineStyle] = useMemo(
    () => getSidebarStyles(type, isHover || open),
    [type, isHover, open],
  );

  // Filter buttons based on enabledElementTypes
  const filteredContentTypes = useMemo(
    () =>
      enabledElementTypes
        ? contentTypesConfig.filter((config) => enabledElementTypes.includes(config.element.type))
        : contentTypesConfig,
    [enabledElementTypes],
  );

  // Handle content type selection
  const handleContentTypeClick = useCallback(
    (element: ContentEditorElement) => {
      if (isQuestionElement(element)) {
        const el = element as ContentEditorQuestionElement;
        const newElement = {
          ...element,
          data: { ...el.data, cvid: cuid() },
        } as ContentEditorQuestionElement;
        onClick(newElement);
      } else {
        onClick(element);
      }
      setOpen(false);
      onPopoverOpenChange?.(false);
    },
    [onClick, onPopoverOpenChange],
  );

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

  const popoverContentStyle = useMemo(() => ({ zIndex: zIndex + EDITOR_SIDEBAR }), [zIndex]);

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
      <PopoverContent
        sideOffset={10}
        className="w-auto border-none bg-background rounded-lg drop-shadow-popover"
        style={popoverContentStyle}
      >
        <div className="grid grid-cols-3 gap-2">
          {filteredContentTypes.map(({ name, icon, element }, index) => (
            <ContentTypeGridItem
              key={index}
              name={name}
              icon={icon}
              onClick={() => handleContentTypeClick(element)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});

ContentEditorSideBar.displayName = 'ContentEditorSideBar';
