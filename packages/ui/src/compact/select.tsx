import { RiCheckLine, RiExpandUpDownLine } from '@usertour/icons';
import { Select } from '@base-ui/react/select';
import { cn } from '@usertour/tailwind';
import type { CSSProperties, ReactNode } from 'react';

export interface CompactSelectOption {
  value: string;
  label: string;
}

export interface CompactSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  options: CompactSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  // Optional leading icon rendered inside the trigger (normalized to 16px).
  icon?: ReactNode;
  // Applied to the positioned popup wrapper — pass a z-index when the select
  // lives inside a high-stacking overlay (e.g. the content builder sidebar).
  contentStyle?: CSSProperties;
}

// All-in-one compact select — a value/onChange/options shape for the common
// "small enum picker in an inspector row" case. Built on Base UI's Select
// (listbox semantics, native keyboard + typeahead, built-in scroll for long
// lists) rather than Radix Select, which mis-handles overflow and gets caught
// in scroll-locks inside popovers/dialogs.
export const CompactSelect = (props: CompactSelectProps) => {
  const {
    value,
    onChange,
    options,
    placeholder = 'Select…',
    disabled,
    className,
    id,
    icon,
    contentStyle,
  } = props;
  return (
    <Select.Root
      value={value ?? null}
      onValueChange={(next) => onChange(next as string)}
      disabled={disabled}
      modal={false}
    >
      <Select.Trigger
        id={id}
        className={cn(
          'flex h-7.5 w-full items-center gap-2 rounded-lg border border-input bg-muted px-3 text-sm text-foreground shadow-sm outline-none transition-colors hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        {icon ? (
          <span className="flex shrink-0 items-center [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        ) : null}
        <Select.Value placeholder={placeholder} className="flex-1 truncate text-left">
          {(selected) => options.find((option) => option.value === selected)?.label ?? placeholder}
        </Select.Value>
        <Select.Icon className="shrink-0 opacity-50">
          <RiExpandUpDownLine className="h-4 w-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={4}
          align="start"
          alignItemWithTrigger={false}
          className="z-50"
          style={contentStyle}
        >
          <Select.Popup className="max-h-[var(--available-height)] w-[var(--anchor-width)] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                label={option.label}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2 pr-8 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-2 flex items-center">
                  <RiCheckLine className="h-4 w-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
};
