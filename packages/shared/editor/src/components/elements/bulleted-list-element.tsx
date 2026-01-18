import type { ReactNode } from 'react';
import { memo } from 'react';
import type { RenderElementProps } from 'slate-react';

import { List, getListClassName } from '@usertour-packages/widget';

// Component props types
interface BulletedListElementProps extends RenderElementProps {
  className?: string;
}

interface BulletedListElementSerializeProps {
  className?: string;
  children: ReactNode;
}

/**
 * Bulleted list element for Slate editor
 * Renders ul with editor attributes for contenteditable support
 */
export const BulletedListElement = memo((props: BulletedListElementProps) => {
  const { className, attributes, children } = props;

  return (
    <ul className={getListClassName('unordered', className)} {...attributes}>
      {children}
    </ul>
  );
});

BulletedListElement.displayName = 'BulletedListElement';

/**
 * Bulleted list element for serialized/rendered output in SDK
 * Uses the widget List component for consistent styling
 */
export const BulletedListElementSerialize = memo((props: BulletedListElementSerializeProps) => {
  const { className, children } = props;

  return (
    <List type="unordered" className={className}>
      {children}
    </List>
  );
});

BulletedListElementSerialize.displayName = 'BulletedListElementSerialize';
