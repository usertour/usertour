// Read-only serialized column component for SDK rendering

import { cn } from '@usertour-packages/tailwind';
import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { ContentEditorColumnElement } from '../../../types/editor';
import { DEFAULT_ALIGN_ITEMS, DEFAULT_JUSTIFY_CONTENT } from '../../constants';
import { transformColumnStyle } from '../../utils';

export interface ContentEditorColumnSerializeProps {
  children: ReactNode;
  element: ContentEditorColumnElement;
}

/**
 * Read-only serialized component for SDK rendering
 * Used to display columns without editing capabilities
 */
export const ContentEditorColumnSerialize = memo(
  ({ element, children }: ContentEditorColumnSerializeProps) => {
    const serializeStyle = useMemo(
      () => transformColumnStyle(element),
      [element.width, element.style?.marginRight],
    );

    return (
      <div
        className={cn(
          'flex relative flex-row ',
          element?.justifyContent ?? DEFAULT_JUSTIFY_CONTENT,
          element?.alignItems ?? DEFAULT_ALIGN_ITEMS,
        )}
        style={serializeStyle}
      >
        {children}
      </div>
    );
  },
);

ContentEditorColumnSerialize.displayName = 'ContentEditorColumnSerialize';
