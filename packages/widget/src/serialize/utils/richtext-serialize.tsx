// Richtext serialization utilities for SDK rendering
// This replaces the slate-dependent serialize.tsx

import { Children, memo } from 'react';
import type { ReactNode } from 'react';

import {
  CodeBlock,
  Heading,
  type HeadingLevel,
  Link,
  List,
  ListItem,
  Paragraph,
} from '../../typography';
import { ALIGN_MAPPING } from '../constants';
import type { DescendantNode, ElementNode } from '../types';
import { isTextNode } from '../types';
import { getTextStyles } from './text-styles';

// Non-breaking space for empty paragraphs
const NBSP = '\u00A0';

// Link open types
const OPEN_TYPE = {
  SAME: 'same',
  NEW: 'new',
} as const;

/**
 * Serialize a text leaf node to JSX for rendering
 */
export const serializeLeaf = (node: DescendantNode, key = ''): ReactNode => {
  if (!isTextNode(node)) {
    return null;
  }

  const string = node.text;

  // Skip empty text nodes
  if (!string) {
    return null;
  }

  const style = getTextStyles(node);

  return (
    <span style={style} key={key}>
      {string}
    </span>
  );
};

/**
 * Serialize a node tree to plain text string
 * Used for simple text extraction with user attribute placeholders
 */
export const serializeMini = (node: DescendantNode): string => {
  if (isTextNode(node)) {
    return node.text;
  }

  const element = node as ElementNode;

  // Skip slash-input elements - they are temporary UI elements for editing only
  if (element.type === 'slash-input') {
    return '';
  }

  if (element.type === 'user-attribute') {
    return `{${element.attrCode || element.fallback}}`;
  }

  if (element.children) {
    return element.children.map((n) => serializeMini(n)).join('');
  }

  return '';
};

// Element serialize components

interface ParagraphSerializeProps {
  className?: string;
  children: ReactNode;
}

const ParagraphSerialize = memo(({ className, children }: ParagraphSerializeProps) => {
  const childArray = Children.toArray(children);
  const isEmpty = childArray.length === 0;
  return <Paragraph className={className}>{isEmpty ? NBSP : children}</Paragraph>;
});
ParagraphSerialize.displayName = 'ParagraphSerialize';

interface HeadingSerializeProps {
  className?: string;
  children: ReactNode;
  headingSize: HeadingLevel;
}

const HeadingSerialize = memo(({ className, children, headingSize }: HeadingSerializeProps) => {
  return (
    <Heading level={headingSize} className={className}>
      {children}
    </Heading>
  );
});
HeadingSerialize.displayName = 'HeadingSerialize';

interface CodeSerializeProps {
  className?: string;
  children: ReactNode;
}

const CodeSerialize = memo(({ className, children }: CodeSerializeProps) => {
  return <CodeBlock className={className}>{children}</CodeBlock>;
});
CodeSerialize.displayName = 'CodeSerialize';

interface ListSerializeProps {
  className?: string;
  children: ReactNode;
  type: 'ordered' | 'unordered';
}

const ListSerialize = memo(({ className, children, type }: ListSerializeProps) => {
  return (
    <List type={type} className={className}>
      {children}
    </List>
  );
});
ListSerialize.displayName = 'ListSerialize';

interface ListItemSerializeProps {
  className?: string;
  children: ReactNode;
}

const ListItemSerialize = memo(({ className, children }: ListItemSerializeProps) => {
  return <ListItem className={className}>{children}</ListItem>;
});
ListItemSerialize.displayName = 'ListItemSerialize';

interface LinkSerializeProps {
  className?: string;
  children: ReactNode;
  element: ElementNode;
}

const LinkSerialize = memo(({ children, element }: LinkSerializeProps) => {
  const isNewTab = element.openType === OPEN_TYPE.NEW;

  return (
    <Link
      href={element.url}
      target={isNewTab ? '_blank' : '_parent'}
      rel={isNewTab ? 'noreferrer' : undefined}
    >
      {children}
    </Link>
  );
});
LinkSerialize.displayName = 'LinkSerialize';

interface UserAttrSerializeProps {
  element: ElementNode;
}

const UserAttrSerialize = memo(({ element }: UserAttrSerializeProps) => {
  return <span>{element.value}</span>;
});
UserAttrSerialize.displayName = 'UserAttrSerialize';

// Element type to component mapping
type ElementType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'code'
  | 'bulleted-list'
  | 'numbered-list'
  | 'list-item'
  | 'link'
  | 'user-attribute';

type SerializeCallback = (type: string, params: Record<string, unknown>) => void;

/**
 * Get the serialize component for an element type
 */
const getElementComponent = (
  type: ElementType,
  element: ElementNode,
  className: string,
  children: ReactNode,
  _callback?: SerializeCallback,
): ReactNode => {
  switch (type) {
    case 'paragraph':
      return <ParagraphSerialize className={className}>{children}</ParagraphSerialize>;
    case 'h1':
      return (
        <HeadingSerialize headingSize={1} className={className}>
          {children}
        </HeadingSerialize>
      );
    case 'h2':
      return (
        <HeadingSerialize headingSize={2} className={className}>
          {children}
        </HeadingSerialize>
      );
    case 'code':
      return <CodeSerialize className={className}>{children}</CodeSerialize>;
    case 'bulleted-list':
      return (
        <ListSerialize type="unordered" className={className}>
          {children}
        </ListSerialize>
      );
    case 'numbered-list':
      return (
        <ListSerialize type="ordered" className={className}>
          {children}
        </ListSerialize>
      );
    case 'list-item':
      return <ListItemSerialize className={className}>{children}</ListItemSerialize>;
    case 'link':
      return (
        <LinkSerialize element={element} className={className}>
          {children}
        </LinkSerialize>
      );
    case 'user-attribute':
      return <UserAttrSerialize element={element} />;
    default:
      return children;
  }
};

/**
 * Internal serialize function with path tracking for stable keys
 */
const serializeNode = (
  node: DescendantNode,
  path: string,
  callback?: SerializeCallback,
): ReactNode => {
  if (isTextNode(node)) {
    return serializeLeaf(node, path);
  }

  const element = node as ElementNode;

  // Skip slash-input elements - they are temporary UI elements for editing only
  if (element.type === 'slash-input') {
    return null;
  }

  const children = element.children?.map((n, i) => serializeNode(n, `${path}-${i}`, callback));
  const cls = element.align ? ALIGN_MAPPING[element.align] || '' : '';
  const type = element.type as ElementType;

  if (!type) {
    return children;
  }

  const component = getElementComponent(type, element, cls, children, callback);

  if (component === children) {
    return children;
  }

  return <span key={path}>{component}</span>;
};

/**
 * Serialize a node tree to React elements
 * Uses path-based keys for stable React reconciliation
 */
export const serialize = (
  node: DescendantNode,
  callback?: SerializeCallback,
  index = 0,
): ReactNode => {
  return serializeNode(node, String(index), callback);
};
