'use client';

import { cn } from '@usertour/tailwind';
import { RiExpandUpDownLine, RiSearchLine } from '@usertour/icons';
import type { CSSProperties, ReactNode } from 'react';
import type { ComboboxContentProps } from './combobox';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInputInline,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from './combobox';

export interface ComboboxSelectOption {
  value: string;
  label: string;
  /** Optional leading decoration (e.g. a data-type icon). */
  leading?: ReactNode;
  /** Optional secondary text (e.g. a codeName); also participates in search. */
  hint?: string;
  disabled?: boolean;
}

export interface ComboboxSelectGroup {
  heading: string;
  options: ComboboxSelectOption[];
}

export interface ComboboxSelectProps {
  /** Flat option list. Use `groups` instead for a grouped list. */
  options?: ComboboxSelectOption[];
  /** Grouped option list (each group renders a heading). */
  groups?: ComboboxSelectGroup[];
  value?: string;
  onValueChange: (value: string) => void;
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

// A button-trigger searchable single-select built on the Base UI Combobox kit.
// Trigger shows the selected label; the search input + filtered list live in
// the popup. Supports optional grouping, per-item leading icon / hint text, and
// a footer slot. i18n-agnostic — the caller passes already-translated copy.
export const ComboboxSelect = (props: ComboboxSelectProps) => {
  const {
    options,
    groups,
    value,
    onValueChange,
    placeholder,
    searchPlaceholder,
    emptyText,
    size = 'default',
    surface = 'muted',
    footerSlot,
    disabled = false,
    className,
    contentClassName,
    contentStyle,
    container,
  } = props;

  const allOptions = groups ? groups.flatMap((group) => group.options) : (options ?? []);
  const selected = allOptions.find((option) => option.value === value) ?? null;

  // Base UI Combobox owns filtering: it filters the `items` it's handed and
  // renders only the *filtered* set through a render-function child. A static
  // `.map` over the original options ignores the typed query (the bug this
  // replaces). Grouped lists use Base UI's `{ value, items }` shape so the
  // query prunes each group and empty groups drop out.
  const comboboxItems = groups
    ? groups.map((group) => ({ value: group.heading, items: group.options }))
    : allOptions;

  // Pack value + label + hint into the searchable string so typing any of them
  // matches — e.g. searching an attribute's codeName (carried in hint) hits an
  // item whose visible label is its displayName.
  const itemToStringValue = (option: ComboboxSelectOption) =>
    `${option.value} ${option.label}${option.hint ? ` ${option.hint}` : ''}`;

  const renderItem = (option: ComboboxSelectOption) => (
    <ComboboxItem key={option.value} value={option} disabled={option.disabled}>
      {option.leading}
      <div className="min-w-0 flex-1">
        <div className="truncate">{option.label}</div>
        {option.hint && (
          <div className="truncate text-[11px] text-muted-foreground">{option.hint}</div>
        )}
      </div>
    </ComboboxItem>
  );

  return (
    <Combobox
      items={comboboxItems}
      value={selected}
      onValueChange={(option: ComboboxSelectOption | null) => {
        if (option) {
          onValueChange(option.value);
        }
      }}
      itemToStringValue={itemToStringValue}
      disabled={disabled}
    >
      <ComboboxTrigger
        disabled={disabled}
        endIcon={<RiExpandUpDownLine className="size-4 shrink-0 opacity-50" />}
        className={cn(
          'flex w-full items-center justify-between border border-input text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
          surface === 'raised'
            ? 'bg-surface-raised dark:bg-surface-raised/50 shadow-none hover:bg-muted'
            : 'bg-muted shadow-sm hover:bg-muted/70',
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
      <ComboboxContent
        className={contentClassName}
        container={container}
        // zIndex must land on the Positioner (it owns the stacking context via
        // `isolate z-50`); putting it on the Popup gets trapped inside that
        // context and the list renders under a higher-z host popover.
        positionerStyle={contentStyle}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <RiSearchLine className="h-4 w-4 shrink-0 text-muted-foreground" />
          <ComboboxInputInline
            placeholder={searchPlaceholder}
            className="h-9 w-full bg-transparent text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {groups
            ? (group: { value: string; items: ComboboxSelectOption[] }) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  <ComboboxLabel>{group.value}</ComboboxLabel>
                  {group.items.map(renderItem)}
                </ComboboxGroup>
              )
            : renderItem}
        </ComboboxList>
        {footerSlot}
      </ComboboxContent>
    </Combobox>
  );
};

ComboboxSelect.displayName = 'ComboboxSelect';
