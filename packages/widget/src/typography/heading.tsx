import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef, memo } from 'react';

import { cn } from '@usertour-packages/tailwind';

// Type definitions
type HeadingLevel = 1 | 2;
type HeadingTag = 'h1' | 'h2';

// Shared heading styles using SDK Tailwind classes
const HEADING_BASE_STYLES = [
  'font-sdk-bold',
  'leading-sdk-heading',
  'text-sdk-foreground',
  'min-h-sdk-line-height',
  'shrink-0',
] as const;

const HEADING_LEVEL_STYLES: Record<HeadingLevel, string> = {
  1: 'text-sdk-h1',
  2: 'text-sdk-h2',
};

/**
 * Get the HTML heading tag based on level
 */
const getHeadingTag = (level: HeadingLevel): HeadingTag => `h${level}` as HeadingTag;

/**
 * Generate heading class names with level-specific and base styles
 */
export const getHeadingClassName = (level: HeadingLevel, className?: string): string =>
  cn(HEADING_LEVEL_STYLES[level], HEADING_BASE_STYLES, className);

// Component props types
export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level: 1 for h1, 2 for h2 */
  level: HeadingLevel;
  children: ReactNode;
}

/**
 * SDK Heading component
 * Renders h1 or h2 with consistent SDK styling
 */
export const Heading = memo(
  forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => {
    const { level, className, children, ...rest } = props;
    const Tag = getHeadingTag(level);

    return (
      <Tag ref={ref} className={getHeadingClassName(level, className)} {...rest}>
        {children}
      </Tag>
    );
  }),
);

Heading.displayName = 'Heading';

// Re-export types for convenience
export type { HeadingLevel };
