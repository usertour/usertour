// Shared popover content component for content type selection

import { EDITOR_SIDEBAR } from '@usertour-packages/constants';
import { PopoverContent } from '@usertour-packages/popover';
import { memo, useMemo } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';
import type { ContentEditorElement } from '../../../types/editor';
import { ContentTypeGridItem } from './content-type-grid-item';
import { useContentTypeSelector } from './hooks/use-content-type-selector';

export interface ContentTypeSelectorPopoverProps
  extends Omit<React.ComponentPropsWithoutRef<typeof PopoverContent>, 'children' | 'onClick'> {
  onClick: (element: ContentEditorElement) => void;
  onClose?: () => void;
}

export const ContentTypeSelectorPopover = memo(
  ({
    onClick,
    onClose,
    sideOffset = 10,
    className,
    style,
    ...props
  }: ContentTypeSelectorPopoverProps) => {
    const { zIndex } = useContentEditorContext();
    const { filteredContentTypes, handleContentTypeClick } = useContentTypeSelector(onClick, {
      onClose,
    });

    const popoverContentStyle = useMemo(
      () => ({
        ...style,
        zIndex: style?.zIndex ?? zIndex + EDITOR_SIDEBAR,
      }),
      [style, zIndex],
    );

    return (
      <PopoverContent
        sideOffset={sideOffset}
        className={className ?? 'w-auto border-none bg-background rounded-lg drop-shadow-popover'}
        style={popoverContentStyle}
        {...props}
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
    );
  },
);

ContentTypeSelectorPopover.displayName = 'ContentTypeSelectorPopover';
