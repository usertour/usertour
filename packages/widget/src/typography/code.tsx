import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef, memo } from 'react';

import { cn } from '@usertour-packages/tailwind';

// Inline code styles (for <code> used inline in text)
const INLINE_CODE_STYLES = [
  'py-0.5',
  'px-1',
  'rounded-sdk-code',
  'bg-sdk-foreground/5',
  'font-mono',
  'text-sdk-sm',
  'text-sdk-foreground',
] as const;

// Block code styles (for <code> inside <pre>)
// Inherits base code styles but overrides padding and adds block display
const BLOCK_CODE_STYLES = [
  'block',
  'p-2',
  'overflow-x-auto',
  'rounded-sdk-code',
  'bg-sdk-foreground/5',
  'font-mono',
  'text-sdk-sm',
  'text-sdk-foreground',
] as const;

// Pre element styles (wrapper for code blocks)
// Only structural styles, visual styles are on the code element
const PRE_STYLES = ['min-h-sdk-line-height', 'shrink-0'] as const;

/**
 * Generate inline code class names
 */
export const getInlineCodeClassName = (className?: string): string =>
  cn(INLINE_CODE_STYLES, className);

/**
 * Generate block code class names (for code inside pre)
 */
export const getBlockCodeClassName = (className?: string): string =>
  cn(BLOCK_CODE_STYLES, className);

/**
 * Generate pre element class names
 */
export const getPreClassName = (className?: string): string => cn(PRE_STYLES, className);

// Component props types
export interface InlineCodeProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  children: ReactNode;
  /** Optional class name for the inner code element */
  codeClassName?: string;
}

/**
 * SDK InlineCode component
 * Renders inline code with consistent SDK styling
 */
export const InlineCode = memo(
  forwardRef<HTMLElement, InlineCodeProps>((props, ref) => {
    const { className, children, ...rest } = props;

    return (
      <code ref={ref} className={getInlineCodeClassName(className)} {...rest}>
        {children}
      </code>
    );
  }),
);

InlineCode.displayName = 'InlineCode';

/**
 * SDK CodeBlock component
 * Renders a pre > code block with consistent SDK styling
 */
export const CodeBlock = memo(
  forwardRef<HTMLPreElement, CodeBlockProps>((props, ref) => {
    const { className, codeClassName, children, ...rest } = props;

    return (
      <pre ref={ref} className={getPreClassName(className)} {...rest}>
        <code className={getBlockCodeClassName(codeClassName)}>{children}</code>
      </pre>
    );
  }),
);

CodeBlock.displayName = 'CodeBlock';
