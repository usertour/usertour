// Read-only serialized component for SDK

import { memo } from 'react';
import type { ReactNode } from 'react';

export interface ContentEditorGroupSerializeProps {
  children: ReactNode;
}

/**
 * Serialized group component for SDK rendering
 * Used in read-only mode without editing capabilities
 */
export const ContentEditorGroupSerialize = memo((props: ContentEditorGroupSerializeProps) => {
  const { children } = props;

  return <div className="relative flex items-stretch">{children}</div>;
});

ContentEditorGroupSerialize.displayName = 'ContentEditorGroupSerialize';
