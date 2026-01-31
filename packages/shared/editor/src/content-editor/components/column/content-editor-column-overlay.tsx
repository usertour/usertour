// Overlay component for column during drag operations

import { cn } from '@usertour-packages/tailwind';
import { forwardRef, memo, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { ContentEditorColumnElement } from '../../../types/editor';
import { DEFAULT_ALIGN_ITEMS, DEFAULT_JUSTIFY_CONTENT, HOVER_CLASSES } from '../../constants';
import { transformColumnStyle } from '../../utils';
import { ColumnHeaderOverlay } from './column-header';

export interface ContentEditorColumnOverlayProps {
  element: ContentEditorColumnElement;
  children: ReactNode;
  id: string;
  path: number[];
  className?: string;
  isInGroup?: boolean;
}

export const ContentEditorColumnOverlay = memo(
  forwardRef<HTMLDivElement, ContentEditorColumnOverlayProps>((props, ref) => {
    const { className, children, isInGroup = false, element } = props;

    const overlayStyle = useMemo(
      () => transformColumnStyle(element),
      [element.width, element.style?.marginRight, element.padding],
    );

    return (
      <div
        ref={ref}
        className={cn(
          'flex relative flex-row ',
          element?.justifyContent ?? DEFAULT_JUSTIFY_CONTENT,
          element?.alignItems ?? DEFAULT_ALIGN_ITEMS,
          !isInGroup ? HOVER_CLASSES : '',
          className,
        )}
        style={overlayStyle}
      >
        {!isInGroup && <ColumnHeaderOverlay />}
        {children}
      </div>
    );
  }),
);

ContentEditorColumnOverlay.displayName = 'ContentEditorColumnOverlay';
