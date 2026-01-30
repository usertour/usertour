import type { ReactNode } from 'react';
import { memo } from 'react';
import type { RenderElementProps } from 'slate-react';

import { CodeBlock, getBlockCodeClassName, getPreClassName } from '@usertour-packages/widget';

// Component props types
interface CodeElementProps extends RenderElementProps {
  className?: string;
}

interface CodeElementSerializeProps {
  className?: string;
  children: ReactNode;
}

/**
 * Code block element for Slate editor
 * Renders pre > code with editor attributes for contenteditable support
 */
export const CodeElement = memo((props: CodeElementProps) => {
  const { className, attributes, children } = props;

  return (
    <pre className={getPreClassName(className)}>
      <code className={getBlockCodeClassName()} {...attributes}>
        {children}
      </code>
    </pre>
  );
});

CodeElement.displayName = 'CodeElement';

/**
 * Code block element for serialized/rendered output in SDK
 * Uses the widget CodeBlock component for consistent styling
 */
export const CodeElementSerialize = memo((props: CodeElementSerializeProps) => {
  const { className, children } = props;

  return <CodeBlock className={className}>{children}</CodeBlock>;
});

CodeElementSerialize.displayName = 'CodeElementSerialize';
