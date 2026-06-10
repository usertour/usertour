import { RiCheckLine, RiExpandUpDownLine } from '@usertour/icons';
import { Select } from '@base-ui/react/select';
import { cn } from '@usertour/tailwind';
import type { CSSProperties, ReactNode } from 'react';

// ── Composable compact Select family (Base UI backed) ───────────────
// Thin @usertour/ui wrappers over Base UI Select so business code can
// compose rich (icon + title + description) selects WITHOUT importing
// @base-ui/react directly. Base UI fixes the radix Select overflow /
// scroll-lock issues inside overlays. For the common single-line enum
// case, reach for the all-in-one CompactSelect at the bottom instead.

export const CompactSelectRoot = Select.Root;
export const CompactSelectValue = Select.Value;

export interface CompactSelectTriggerProps {
  id?: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

export const CompactSelectTrigger = (props: CompactSelectTriggerProps) => {
  const { id, className, disabled, children } = props;
  return (
    <Select.Trigger
      id={id}
      disabled={disabled}
      className={cn(
        'flex h-7.5 w-full items-center gap-2 rounded-lg border border-input bg-muted dark:bg-surface-raised/50 px-3 text-sm text-foreground shadow-sm outline-none transition-colors hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
      <Select.Icon className="ml-auto shrink-0 opacity-50">
        <RiExpandUpDownLine className="h-4 w-4" />
      </Select.Icon>
    </Select.Trigger>
  );
};

export interface CompactSelectContentProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export const CompactSelectContent = (props: CompactSelectContentProps) => {
  const { className, style, children } = props;
  return (
    <Select.Portal>
      <Select.Positioner
        sideOffset={4}
        align="start"
        alignItemWithTrigger={false}
        className="z-50"
        style={style}
      >
        <Select.Popup
          className={cn(
            'max-h-[var(--available-height)] w-[var(--anchor-width)] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none',
            className,
          )}
        >
          {children}
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  );
};

export interface CompactSelectItemProps {
  value: string;
  // Plain-text representation used for keyboard typeahead.
  label?: string;
  className?: string;
  children: ReactNode;
}

export const CompactSelectItem = (props: CompactSelectItemProps) => {
  const { value, label, className, children } = props;
  return (
    <Select.Item
      value={value}
      label={label}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
    >
      {children}
    </Select.Item>
  );
};

export const CompactSelectItemIndicator = (props: { className?: string }) => (
  <Select.ItemIndicator className={cn('absolute right-2 flex items-center', props.className)}>
    <RiCheckLine className="h-4 w-4" />
  </Select.ItemIndicator>
);

// ── All-in-one single-line enum picker ──────────────────────────────

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
    <CompactSelectRoot
      value={value ?? null}
      onValueChange={(next) => onChange(next as string)}
      disabled={disabled}
      modal={false}
    >
      <CompactSelectTrigger id={id} className={className}>
        {icon ? (
          <span className="flex shrink-0 items-center [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        ) : null}
        <CompactSelectValue placeholder={placeholder} className="min-w-0 flex-1 truncate text-left">
          {(selected) => options.find((option) => option.value === selected)?.label ?? placeholder}
        </CompactSelectValue>
      </CompactSelectTrigger>
      <CompactSelectContent style={contentStyle}>
        {options.map((option) => (
          <CompactSelectItem
            key={option.value}
            value={option.value}
            label={option.label}
            className="pr-8"
          >
            {option.label}
            <CompactSelectItemIndicator />
          </CompactSelectItem>
        ))}
      </CompactSelectContent>
    </CompactSelectRoot>
  );
};
