'use client';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from './combobox';
import {
  type ComboboxSelectBaseProps,
  type ComboboxSelectGroup,
  type ComboboxSelectOption,
  SearchHeader,
  SelectTrigger,
  itemToStringValue,
} from './combobox-select-shared';

export type { ComboboxSelectOption, ComboboxSelectGroup } from './combobox-select-shared';

export interface ComboboxSelectProps extends ComboboxSelectBaseProps {
  /** Flat option list. Use `groups` instead for a grouped list. */
  options?: ComboboxSelectOption[];
  /** Grouped option list (each group renders a heading). */
  groups?: ComboboxSelectGroup[];
  /**
   * Where the hint renders: 'stacked' (default) as a second line under the
   * label, 'trailing' on the same line at the row's trailing edge — the
   * compact layout for short hints like attribute codeNames. Display only;
   * the hint participates in search either way (itemToStringValue).
   */
  hintPlacement?: 'stacked' | 'trailing';
}

const renderItem = (option: ComboboxSelectOption, hintPlacement: 'stacked' | 'trailing') => {
  if (hintPlacement === 'trailing') {
    return (
      <ComboboxItem key={option.value} value={option} disabled={option.disabled}>
        {option.leading}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {option.hint && (
          <span className="max-w-[45%] shrink-0 truncate text-[11px] text-muted-foreground">
            {option.hint}
          </span>
        )}
      </ComboboxItem>
    );
  }
  return (
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
};

// A button-trigger searchable single-select built on the Base UI Combobox kit.
// Trigger shows the selected label; the search input + filtered list live in
// the popup. Supports optional grouping, per-item leading icon / hint text, and
// a footer slot. i18n-agnostic — the caller passes already-translated copy.
// For very large lists (hundreds+ of options) use VirtualizedComboboxSelect.
export const ComboboxSelect = (props: ComboboxSelectProps) => {
  const {
    options,
    groups,
    value,
    onValueChange,
    id,
    placeholder,
    searchPlaceholder,
    emptyText,
    size = 'default',
    surface = 'muted',
    footerSlot,
    hintPlacement = 'stacked',
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
      <SelectTrigger
        id={id}
        disabled={disabled}
        size={size}
        surface={surface}
        className={className}
        placeholder={placeholder}
      />
      <ComboboxContent
        className={contentClassName}
        container={container}
        // zIndex must land on the Positioner (it owns the stacking context via
        // `isolate z-50`); putting it on the Popup gets trapped inside that
        // context and the list renders under a higher-z host popover.
        positionerStyle={contentStyle}
      >
        <SearchHeader placeholder={searchPlaceholder} />
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {groups
            ? (group: { value: string; items: ComboboxSelectOption[] }) => (
                <ComboboxGroup key={group.value} items={group.items}>
                  <ComboboxLabel>{group.value}</ComboboxLabel>
                  {group.items.map((option) => renderItem(option, hintPlacement))}
                </ComboboxGroup>
              )
            : (option: ComboboxSelectOption) => renderItem(option, hintPlacement)}
        </ComboboxList>
        {footerSlot}
      </ComboboxContent>
    </Combobox>
  );
};

ComboboxSelect.displayName = 'ComboboxSelect';
