import type { ReactNode } from 'react';
import { memo } from 'react';
import type { RenderElementProps } from 'slate-react';

import { ListItem } from '@usertour-packages/widget';

// Component props types
interface ListItemElementProps extends RenderElementProps {
  className?: string;
}

interface ListItemElementSerializeProps {
  className?: string;
  children: ReactNode;
}

/**
 * List item element for Slate editor
 * Renders li with editor attributes for contenteditable support
 */
export const ListItemElement = memo((props: ListItemElementProps) => {
  const { className, attributes, children } = props;

  return (
    <ListItem className={className} {...attributes}>
      {children}
    </ListItem>
  );
});

ListItemElement.displayName = 'ListItemElement';

/**
 * List item element for serialized/rendered output in SDK
 * Uses the widget ListItem component for consistent styling
 */
export const ListItemElementSerialize = memo((props: ListItemElementSerializeProps) => {
  const { className, children } = props;

  return <ListItem className={className}>{children}</ListItem>;
});

ListItemElementSerialize.displayName = 'ListItemElementSerialize';
