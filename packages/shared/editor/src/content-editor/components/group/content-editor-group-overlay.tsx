// Overlay component for group drag preview

import { forwardRef, memo } from 'react';
import type { ReactNode } from 'react';

import { ContentEditorGroupElement } from '../../../types/editor';
import { GroupDragHandle } from './group-drag-handle';

export interface ContentEditorGroupOverlayProps {
  children: ReactNode;
  element: ContentEditorGroupElement;
  id: string;
  path: number[];
  items: any[];
}

export const ContentEditorGroupOverlay = memo(
  forwardRef<HTMLDivElement, ContentEditorGroupOverlayProps>((props, ref) => {
    const { children } = props;

    return (
      <div ref={ref} className="relative h-full w-full flex items-stretch">
        <GroupDragHandle isVisible={true} isOverlay={true} />
        {children}
      </div>
    );
  }),
);

ContentEditorGroupOverlay.displayName = 'ContentEditorGroupOverlay';
