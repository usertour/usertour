import type { ReactNode } from 'react';
import { Children, memo } from 'react';
import type { RenderElementProps } from 'slate-react';

import { Paragraph, getParagraphClassName } from '@usertour-packages/widget';

// Non-breaking space for empty paragraphs
const NBSP = '\u00A0';

// Component props types
interface ParagraphElementProps extends RenderElementProps {
  className?: string;
}

interface ParagraphElementSerializeProps {
  className?: string;
  children: ReactNode;
}

/**
 * Paragraph element for Slate editor
 * Renders paragraph with editor attributes for contenteditable support
 */
const ParagraphElement = memo((props: ParagraphElementProps) => {
  const { className, attributes, children } = props;

  return (
    <p className={getParagraphClassName(className)} {...attributes}>
      {children}
    </p>
  );
});

ParagraphElement.displayName = 'ParagraphElement';

/**
 * Paragraph element for serialized/rendered output in SDK
 * Uses the widget Paragraph component for consistent styling
 * Handles empty paragraphs by inserting non-breaking space
 */
export const ParagraphElementSerialize = memo((props: ParagraphElementSerializeProps) => {
  const { className, children } = props;

  // Use Children.toArray to properly handle Fragment and filter out null/undefined
  // This correctly detects empty paragraphs (all children are null after serialization)
  const childArray = Children.toArray(children);
  const isEmpty = childArray.length === 0;

  return <Paragraph className={className}>{isEmpty ? NBSP : children}</Paragraph>;
});

ParagraphElementSerialize.displayName = 'ParagraphElementSerialize';

export default ParagraphElement;
