'use client';

import { RiExpandUpDownLine, RiSearchLine } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import type { CSSProperties, ReactNode } from 'react';
import type { ComboboxContentProps } from './combobox';
import { ComboboxInputInline, ComboboxTrigger, ComboboxValue } from './combobox';

// Shared building blocks for the two searchable single-selects built on the
// Base UI Combobox kit — ComboboxSelect (standard, grouped) and
// VirtualizedComboboxSelect (windowed). They share the option shape, the base
// props, the trigger button and the search header; each owns its own list.

export interface ComboboxSelectOption {
  value: string;
  label: string;
  /** Optional leading decoration (e.g. a data-type icon). */
  leading?: ReactNode;
  /** Optional secondary text (e.g. a codeName); also participates in search. */
  hint?: string;
  disabled?: boolean;
  /**
   * Optional group key. In the virtualized list a divider is drawn between two
   * adjacent items whose group key differs — a section break without a heading.
   * Ignored by the standard list (group it with `groups` instead).
   */
  group?: string;
}

export interface ComboboxSelectGroup {
  heading: string;
  options: ComboboxSelectOption[];
}

// Props common to both selects. Each component adds its own list shape (grouped
// options vs a flat windowed list).
export interface ComboboxSelectBaseProps {
  value?: string;
  onValueChange: (value: string) => void;
  /** Forwarded to the trigger button so a sibling `<label htmlFor>` can target it. */
  id?: string;
  /** Shown on the trigger when nothing is selected. Pass t('…') — no English default. */
  placeholder?: string;
  /** Search input placeholder inside the popup. Pass t('…'). */
  searchPlaceholder?: string;
  /** Shown when no option matches. Pass t('…'). */
  emptyText?: string;
  /** `compact` aligns the trigger with field controls (h-7.5, rounded-lg). */
  size?: 'default' | 'compact';
  /**
   * Trigger surface. `muted` (default) = bg-muted, for popovers / dialogs.
   * `raised` = bg-surface-raised + shadow-none, for the builder editor where
   * controls sit on a surface card and must match the input + select around
   * them.
   */
  surface?: 'muted' | 'raised';
  /** Extra node rendered after the list (e.g. a "Create new" action). */
  footerSlot?: ReactNode;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  /**
   * Portal mount target for the popup. Pass a node inside a Radix Dialog so
   * the list stays clickable/scrollable — a body-portaled popup is dead to
   * pointer + wheel under the Dialog's react-remove-scroll.
   */
  container?: ComboboxContentProps['container'];
}

// Pack value + label + hint into the searchable string so typing any of them
// matches — e.g. searching an attribute's codeName (carried in hint) hits an
// item whose visible label is its displayName.
export const itemToStringValue = (option: ComboboxSelectOption) =>
  `${option.value} ${option.label}${option.hint ? ` ${option.hint}` : ''}`;

interface SelectTriggerProps {
  id?: string;
  disabled: boolean;
  size: 'default' | 'compact';
  surface: 'muted' | 'raised';
  className?: string;
  placeholder?: string;
}

// Button trigger: shows the selected option's label, or the placeholder when
// nothing is picked.
export const SelectTrigger = (props: SelectTriggerProps) => {
  const { id, disabled, size, surface, className, placeholder } = props;
  return (
    <ComboboxTrigger
      id={id}
      disabled={disabled}
      endIcon={<RiExpandUpDownLine className="size-4 shrink-0 opacity-50" />}
      className={cn(
        'flex w-full items-center justify-between border border-input text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        surface === 'raised'
          ? 'bg-surface-raised dark:bg-surface-raised/50 shadow-none hover:bg-muted'
          : 'bg-muted dark:bg-surface-raised/50 shadow-sm hover:bg-muted/70',
        size === 'compact' ? 'h-7.5 rounded-lg px-3' : 'h-9 rounded-md px-3',
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-left">
        <ComboboxValue>
          {(option: ComboboxSelectOption | null) =>
            option ? option.label : <span className="text-muted-foreground">{placeholder}</span>
          }
        </ComboboxValue>
      </span>
    </ComboboxTrigger>
  );
};

// Search field pinned to the top of the popup.
export const SearchHeader = (props: { placeholder?: string }) => {
  const { placeholder } = props;
  return (
    <div className="flex items-center gap-2 border-b px-3">
      <RiSearchLine className="h-4 w-4 shrink-0 text-muted-foreground" />
      <ComboboxInputInline
        placeholder={placeholder}
        className="h-9 w-full bg-transparent text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
};
