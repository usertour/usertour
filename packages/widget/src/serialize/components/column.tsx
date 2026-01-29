// Column serialize component for SDK rendering

import type { ContentEditorColumnElement } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_ALIGN_ITEMS, DEFAULT_JUSTIFY_CONTENT } from '../constants';
import { transformColumnStyle } from '../utils';

export interface ColumnSerializeProps {
  children: ReactNode;
  element: ContentEditorColumnElement;
}

/**
 * Read-only serialized component for SDK rendering
 * Used to display columns without editing capabilities
 */
export const ColumnSerialize = memo(({ element, children }: ColumnSerializeProps) => {
  const serializeStyle = useMemo(
    () => transformColumnStyle(element),
    [element.width, element.style?.marginRight, element.padding],
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
});

ColumnSerialize.displayName = 'ColumnSerialize';
