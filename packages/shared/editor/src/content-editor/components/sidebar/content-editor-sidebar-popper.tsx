// Sidebar popper component for adding new content elements

import { EDITOR_SIDEBAR } from '@usertour-packages/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import type { PopoverProps } from '@usertour-packages/popover';
import { cuid, isQuestionElement } from '@usertour/helpers';
import { memo, useCallback, useMemo } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';
import type { ContentEditorElement, ContentEditorQuestionElement } from '../../../types/editor';
import { contentTypesConfig } from '../../../utils/config';

export interface ContentEditorSideBarPopperProps extends PopoverProps {
  onClick: (element: ContentEditorElement) => void;
}

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

export const ContentEditorSideBarPopper = memo(
  ({ onClick, children, ...popoverProps }: ContentEditorSideBarPopperProps) => {
    const { zIndex, enabledElementTypes } = useContentEditorContext();

    // Filter buttons based on enabledElementTypes
    const filteredContentTypes = useMemo(
      () =>
        enabledElementTypes
          ? contentTypesConfig.filter((config) => enabledElementTypes.includes(config.element.type))
          : contentTypesConfig,
      [enabledElementTypes],
    );

    const handleClick = useCallback(
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
      },
      [onClick],
    );

    const popoverContentStyle = useMemo(() => ({ zIndex: zIndex + EDITOR_SIDEBAR }), [zIndex]);

    return (
      <Popover {...popoverProps}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
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
                onClick={() => handleClick(element)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

ContentEditorSideBarPopper.displayName = 'ContentEditorSideBarPopper';
