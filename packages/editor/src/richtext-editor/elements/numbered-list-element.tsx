import type { ReactNode } from 'react';
import { memo } from 'react';
import type { RenderElementProps } from 'slate-react';

import { List, getListClassName } from '@usertour-packages/widget';

// Component props types
interface NumberedListElementProps extends RenderElementProps {
  className?: string;
}

interface NumberedListElementSerializeProps {
  className?: string;
  children: ReactNode;
}

/**
 * Numbered list element for Slate editor
 * Renders ol with editor attributes for contenteditable support
 */
export const NumberedListElement = memo((props: NumberedListElementProps) => {
  const { className, attributes, children } = props;

  return (
    <ol className={getListClassName('ordered', className)} {...attributes}>
      {children}
    </ol>
  );
});

NumberedListElement.displayName = 'NumberedListElement';

/**
 * Numbered list element for serialized/rendered output in SDK
 * Uses the widget List component for consistent styling
 */
export const NumberedListElementSerialize = memo((props: NumberedListElementSerializeProps) => {
  const { className, children } = props;

  return (
    <List type="ordered" className={className}>
      {children}
    </List>
  );
});

NumberedListElementSerialize.displayName = 'NumberedListElementSerialize';
