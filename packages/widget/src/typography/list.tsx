import type { HTMLAttributes, ReactNode } from 'react';
import { forwardRef, memo } from 'react';

import { cn } from '@usertour-packages/tailwind';

// Type definitions
type ListType = 'ordered' | 'unordered';
type ListTag = 'ol' | 'ul';

// Shared list styles using SDK Tailwind classes
const LIST_BASE_STYLES = ['min-h-sdk-line-height', 'shrink-0', 'list-outside', 'ml-6'] as const;

const LIST_TYPE_STYLES: Record<ListType, string> = {
  ordered: 'list-decimal',
  unordered: 'list-disc',
};

// Shared list item styles using SDK Tailwind classes
const LIST_ITEM_STYLES = ['whitespace-pre-wrap', 'break-words'] as const;

/**
 * Get the HTML list tag based on type
 */
const getListTag = (type: ListType): ListTag => (type === 'ordered' ? 'ol' : 'ul');

/**
 * Generate list class names with type-specific and base styles
 */
export const getListClassName = (type: ListType, className?: string): string =>
  cn(LIST_TYPE_STYLES[type], LIST_BASE_STYLES, className);

/**
 * Generate list item class names
 */
export const getListItemClassName = (className?: string): string => cn(LIST_ITEM_STYLES, className);

// Component props types
export interface ListProps extends HTMLAttributes<HTMLOListElement | HTMLUListElement> {
  /** List type: 'ordered' for ol, 'unordered' for ul */
  type: ListType;
  children: ReactNode;
}

export interface ListItemProps extends HTMLAttributes<HTMLLIElement> {
  children: ReactNode;
}

/**
 * SDK List component
 * Renders ol or ul with consistent SDK styling
 */
export const List = memo(
  forwardRef<HTMLOListElement | HTMLUListElement, ListProps>((props, ref) => {
    const { type, className, children, ...rest } = props;
    const Tag = getListTag(type);

    return (
      <Tag
        ref={ref as React.Ref<HTMLOListElement> & React.Ref<HTMLUListElement>}
        className={getListClassName(type, className)}
        {...rest}
      >
        {children}
      </Tag>
    );
  }),
);

List.displayName = 'List';

/**
 * SDK ListItem component
 * Renders li element for use inside List component
 */
export const ListItem = memo(
  forwardRef<HTMLLIElement, ListItemProps>((props, ref) => {
    const { className, children, ...rest } = props;

    return (
      <li ref={ref} className={getListItemClassName(className)} {...rest}>
        {children}
      </li>
    );
  }),
);

ListItem.displayName = 'ListItem';

// Re-export types for convenience
export type { ListType };
