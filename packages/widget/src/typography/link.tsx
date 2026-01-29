import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { forwardRef, memo } from 'react';

import { cn } from '@usertour-packages/tailwind';

// Link styles using SDK Tailwind classes
const LINK_STYLES = ['text-sdk-link', 'underline', 'hover:no-underline'] as const;

/**
 * Generate link class names
 */
export const getLinkClassName = (className?: string): string => cn(LINK_STYLES, className);

// Component props types
export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
}

/**
 * SDK Link component
 * Renders anchor with consistent SDK styling
 */
export const Link = memo(
  forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
    const { className, children, ...rest } = props;

    return (
      <a ref={ref} className={getLinkClassName(className)} {...rest}>
        {children}
      </a>
    );
  }),
);

Link.displayName = 'Link';
