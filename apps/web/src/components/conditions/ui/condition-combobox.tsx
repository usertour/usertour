import { ComboboxSelect } from '@usertour/ui';
import { type ReactNode } from 'react';
import { useConditionsZIndex } from '../conditions-context';

export interface ConditionComboboxItem {
  value: string;
  label: string;
  // Optional decoration (e.g., an icon for attribute datatype)
  leading?: ReactNode;
  // Optional secondary line (e.g., attribute description)
  hint?: string;
  // Disable the item without removing it from the list
  disabled?: boolean;
}

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  items: ConditionComboboxItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  // Optional grouping: renders a heading above each set
  groups?: { heading: string; items: ConditionComboboxItem[] }[];
  /**
   * 'attribute' opts into the compact attribute-picker look; every other
   * picker keeps the stock combobox appearance.
   */
  variant?: 'default' | 'attribute';
}

// Searchable picker. Used wherever the user picks from a long list (attributes,
// events, contents, segments). Thin wrapper over the shared ComboboxSelect that
// wires in the conditions-chrome z-index and compact field sizing — the item
// shape (value/label/leading/hint) is already what ComboboxSelect expects.

// Attribute-picker list styling, applied through the popup container via
// data-slot descendant selectors so the shared combobox defaults stay
// untouched for every other consumer:
// - group headings render as a full-bleed muted band (structure via
//   background, not decoration);
// - no trailing checkmark gutter — the trigger already answers "what is
//   currently picked", so selection reads as a whisper-level medium weight
//   and rows keep a symmetric padding.
const ATTRIBUTE_LIST_CLASS = [
  '[&_[data-slot=combobox-label]]:-mx-1',
  '[&_[data-slot=combobox-label]]:bg-muted/50',
  '[&_[data-slot=combobox-label]]:px-3',
  '[&_[data-slot=combobox-item]]:pr-2',
  '[&_[data-slot=combobox-item-indicator]]:hidden',
  '[&_[data-slot=combobox-item][data-selected]]:font-medium',
].join(' ');

export function ConditionCombobox({
  value,
  onChange,
  items,
  placeholder,
  searchPlaceholder,
  emptyText = '',
  disabled,
  className,
  groups,
  variant = 'default',
}: Props) {
  const { popover } = useConditionsZIndex();

  return (
    <ComboboxSelect
      size="compact"
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      disabled={disabled}
      // Match the conditions editor chrome (CompactPopoverTrigger + the
      // surface-raised inputs): a raised trigger so the value picker sits
      // flush with the operator select and the rest of the editor popover.
      surface="raised"
      className={className}
      options={groups ? undefined : items}
      groups={groups?.map((group) => ({ heading: group.heading, options: group.items }))}
      hintPlacement={variant === 'attribute' ? 'trailing' : 'stacked'}
      contentClassName={variant === 'attribute' ? ATTRIBUTE_LIST_CLASS : undefined}
      contentStyle={{ zIndex: popover }}
    />
  );
}
