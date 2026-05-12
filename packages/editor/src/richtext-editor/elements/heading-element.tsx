import type { ReactNode } from 'react';
import { memo } from 'react';
import type { RenderElementProps } from 'slate-react';

import { Heading, getHeadingClassName, type HeadingLevel } from '@usertour-packages/widget';

// Component props types
interface HeadingElementProps extends RenderElementProps {
  className?: string;
  headingSize: HeadingLevel;
}

interface HeadingElementSerializeProps {
  className?: string;
  headingSize: HeadingLevel;
  children: ReactNode;
}

/**
 * Heading element for Slate editor
 * Renders h1 or h2 with editor attributes for contenteditable support
 */
export const HeadingElement = memo((props: HeadingElementProps) => {
  const { attributes, children, className, headingSize } = props;
  const Tag = `h${headingSize}` as 'h1' | 'h2';

  return (
    <Tag {...attributes} className={getHeadingClassName(headingSize, className)}>
      {children}
    </Tag>
  );
});

HeadingElement.displayName = 'HeadingElement';

/**
 * Heading element for serialized/rendered output in SDK
 * Uses the widget Heading component for consistent styling
 */
export const HeadingElementSerialize = memo((props: HeadingElementSerializeProps) => {
  const { children, headingSize, className } = props;

  return (
    <Heading level={headingSize} className={className}>
      {children}
    </Heading>
  );
});

HeadingElementSerialize.displayName = 'HeadingElementSerialize';
