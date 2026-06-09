'use client';

import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group';
import { cn } from '@usertour/tailwind';
import { Button } from '../primitives/button';

const Combobox = ComboboxPrimitive.Root;

export type ComboboxValueProps = ComboboxPrimitive.Value.Props;

const ComboboxValue = (props: ComboboxValueProps) => (
  <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
);

export type ComboboxTriggerProps = ComboboxPrimitive.Trigger.Props & {
  /**
   * Trailing icon. Defaults to a chevron (the input-trigger affordance);
   * pass an up/down caret to align a button-trigger select with the rest
   * of the field controls (CompactSelect / ConditionCombobox).
   */
  endIcon?: React.ReactNode;
};

const ComboboxTrigger = (props: ComboboxTriggerProps) => {
  const { className, children, endIcon, ...rest } = props;
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...rest}
    >
      {children}
      {endIcon ?? (
        <IconChevronDown
          data-slot="combobox-trigger-icon"
          className="text-muted-foreground pointer-events-none size-4"
        />
      )}
    </ComboboxPrimitive.Trigger>
  );
};

export type ComboboxClearProps = ComboboxPrimitive.Clear.Props;

const ComboboxClear = (props: ComboboxClearProps) => {
  const { className, ...rest } = props;
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...rest}
    >
      <IconX className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  );
};

export type ComboboxInputProps = ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean;
  showClear?: boolean;
};

const ComboboxInput = (props: ComboboxInputProps) => {
  const {
    className,
    children,
    disabled = false,
    showTrigger = true,
    showClear = false,
    ...rest
  } = props;
  return (
    <InputGroup className={cn('w-auto', className)}>
      <ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...rest} />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            asChild
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          >
            <ComboboxTrigger />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
};

export type ComboboxContentProps = ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
  > & {
    positionerClassName?: string;
    positionerStyle?: React.CSSProperties;
    /**
     * Portal mount target. Pass a node inside a Radix Dialog so the popup
     * lands within react-remove-scroll's allow-tree — a body-portaled popup
     * is dead to pointer + wheel inside a Dialog. Defaults to document.body.
     */
    container?: ComboboxPrimitive.Portal.Props['container'];
  };

const ComboboxContent = (props: ComboboxContentProps) => {
  const {
    className,
    side = 'bottom',
    sideOffset = 6,
    align = 'start',
    alignOffset = 0,
    anchor,
    style,
    positionerClassName,
    positionerStyle,
    container,
    ...rest
  } = props;
  return (
    <ComboboxPrimitive.Portal container={container}>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className={cn('isolate z-50', positionerClassName)}
        style={positionerStyle}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:border-input/30 group/combobox-content relative max-h-96 w-[var(--anchor-width)] max-w-[var(--available-width)] min-w-[calc(var(--anchor-width)+1.75rem)] origin-[var(--transform-origin)] overflow-hidden rounded-md shadow-md ring-1 duration-100 data-[chips=true]:min-w-[var(--anchor-width)] *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:shadow-none',
            className,
          )}
          style={style}
          {...rest}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
};

export type ComboboxListProps = ComboboxPrimitive.List.Props;

const ComboboxList = (props: ComboboxListProps) => {
  const { className, ...rest } = props;
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        'max-h-[min(calc(24rem-2.25rem),calc(var(--available-height)-2.25rem))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0',
        className,
      )}
      {...rest}
    />
  );
};

export type ComboboxItemProps = ComboboxPrimitive.Item.Props;

const ComboboxItem = (props: ComboboxItemProps) => {
  const { className, children, ...rest } = props;
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...rest}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <IconCheck className="pointer-events-none size-4 pointer-coarse:size-5" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
};

export type ComboboxGroupProps = ComboboxPrimitive.Group.Props;

const ComboboxGroup = (props: ComboboxGroupProps) => {
  const { className, ...rest } = props;
  return <ComboboxPrimitive.Group data-slot="combobox-group" className={cn(className)} {...rest} />;
};

export type ComboboxLabelProps = ComboboxPrimitive.GroupLabel.Props;

const ComboboxLabel = (props: ComboboxLabelProps) => {
  const { className, ...rest } = props;
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(
        'text-muted-foreground px-2 py-1.5 text-xs pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm',
        className,
      )}
      {...rest}
    />
  );
};

export type ComboboxCollectionProps = ComboboxPrimitive.Collection.Props;

const ComboboxCollection = (props: ComboboxCollectionProps) => (
  <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
);

export type ComboboxEmptyProps = ComboboxPrimitive.Empty.Props;

const ComboboxEmpty = (props: ComboboxEmptyProps) => {
  const { className, ...rest } = props;
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        'text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-[empty]/combobox-content:flex',
        className,
      )}
      {...rest}
    />
  );
};

export type ComboboxSeparatorProps = ComboboxPrimitive.Separator.Props;

const ComboboxSeparator = (props: ComboboxSeparatorProps) => {
  const { className, ...rest } = props;
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...rest}
    />
  );
};

export type ComboboxChipsProps = React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props;

const ComboboxChips = (props: ComboboxChipsProps) => {
  const { className, ...rest } = props;
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        'dark:bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive dark:has-aria-invalid:border-destructive/50 flex min-h-9 flex-wrap gap-1.5 rounded-md border bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] has-aria-invalid:ring-[3px] has-data-[slot=combobox-chip]:px-1.5',
        className,
      )}
      {...rest}
    />
  );
};

export type ComboboxChipProps = ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
};

const ComboboxChip = (props: ComboboxChipProps) => {
  const { className, children, showRemove = true, ...rest } = props;
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        'bg-muted text-foreground flex h-[1.375rem] w-fit items-center justify-center gap-1 rounded-[3px] px-1.5 text-xs font-medium has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0',
        className,
      )}
      {...rest}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-sm" />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <IconX className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
};

export type ComboboxChipsInputProps = ComboboxPrimitive.Input.Props;

const ComboboxChipsInput = (props: ComboboxChipsInputProps) => {
  const { className, ...rest } = props;
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn('min-w-16 flex-1 outline-none', className)}
      {...rest}
    />
  );
};

export type ComboboxInputInlineProps = ComboboxPrimitive.Input.Props & {
  className?: string;
};

/**
 * Inline ComboboxInput for use in inline contexts (e.g., Slate editor)
 * Renders a plain input element without InputGroup wrapper to avoid div nesting
 */
const ComboboxInputInline = React.forwardRef<HTMLInputElement, ComboboxInputInlineProps>(
  (props, ref) => {
    const { className, ...rest } = props;
    return (
      <ComboboxPrimitive.Input
        render={React.createElement('input', {
          ref,
          className: cn('outline-none', className),
        })}
        {...rest}
      />
    );
  },
);

ComboboxInputInline.displayName = 'ComboboxInputInline';

const useComboboxAnchor = () => {
  return React.useRef<HTMLDivElement | null>(null);
};

export {
  Combobox,
  ComboboxInput,
  ComboboxInputInline,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
