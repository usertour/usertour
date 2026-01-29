// Group serialize component for SDK rendering

import { memo } from 'react';
import type { ReactNode } from 'react';

export interface GroupSerializeProps {
  children: ReactNode;
}

/**
 * Serialized group component for SDK rendering
 * Used in read-only mode without editing capabilities
 */
export const GroupSerialize = memo((props: GroupSerializeProps) => {
  const { children } = props;

  return <div className="relative flex items-stretch">{children}</div>;
});

GroupSerialize.displayName = 'GroupSerialize';
