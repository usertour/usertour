import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef, memo } from 'react';

import { cn } from '@usertour-packages/tailwind';

// Shared paragraph styles using SDK Tailwind classes
const PARAGRAPH_STYLES = [
  'w-full',
  'whitespace-pre-wrap',
  'break-words',
  'min-h-sdk-line-height',
  'shrink-0',
] as const;

/**
 * Generate paragraph class names
 */
export const getParagraphClassName = (className?: string): string =>
  cn(PARAGRAPH_STYLES, className);

// Component props types
export interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

/**
 * SDK Paragraph component
 * Renders paragraph with consistent SDK styling
 */
export const Paragraph = memo(
  forwardRef<HTMLParagraphElement, ParagraphProps>((props, ref) => {
    const { className, children, ...rest } = props;

    return (
      <p ref={ref} className={getParagraphClassName(className)} {...rest}>
        {children}
      </p>
    );
  }),
);

Paragraph.displayName = 'Paragraph';
