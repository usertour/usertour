import { ComboboxSelect } from '@usertour/ui';
import { cn } from '@usertour/tailwind';
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
}

// Searchable picker. Used wherever the user picks from a long list (attributes,
// events, contents, segments). Thin wrapper over the shared ComboboxSelect that
// wires in the conditions-chrome z-index and compact field sizing — the item
// shape (value/label/leading/hint) is already what ComboboxSelect expects.
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
      // Match the rest of the conditions chrome (CompactPopoverTrigger):
      // white surface + softer hover, overriding ComboboxSelect's default
      // muted fill so the value picker sits flush with the operator select.
      className={cn('bg-background hover:bg-muted/40 dark:bg-muted', className)}
      options={groups ? undefined : items}
      groups={groups?.map((group) => ({ heading: group.heading, options: group.items }))}
      contentStyle={{ zIndex: popover }}
    />
  );
}
