import type { ReactNode } from 'react';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '../../primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../primitives/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../primitives/tooltip';

export interface ResourceRowActionItem {
  /**
   * Stable key — usually the action verb ("edit", "delete", "setPrimary").
   * React uses it for list reconciliation.
   */
  key: string;
  icon?: ReactNode;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /**
   * Renders with destructive styling. Typically applied to the trailing
   * "Delete" item.
   */
  destructive?: boolean;
  /**
   * Insert a separator above this item. The grouping pattern most list
   * actions use is "primary action(s)" + separator + "destructive".
   */
  separatorBefore?: boolean;
}

export interface ResourceRowActionsProps {
  items: readonly ResourceRowActionItem[];
  /**
   * When true, the menu trigger is rendered disabled with a tooltip
   * explaining why — used by predefined attributes/events whose action
   * menu would otherwise just hold disabled items.
   */
  disabled?: boolean;
  disabledHint?: ReactNode;
  align?: 'start' | 'end' | 'center';
  /**
   * Width of the dropdown content. Defaults to `w-[200px]` which fits
   * the typical "Edit / Delete" labels.
   */
  contentClassName?: string;
}

/**
 * Three-dot action menu used by every Settings list row. Replaces the
 * hand-rolled `DropdownMenu + DropdownMenuTrigger + Button + Items` block
 * (often 60–100 LOC) and folds the "predefined → tooltip on the trigger"
 * branch that was previously duplicated across attributes/events.
 */
export const ResourceRowActions = (props: ResourceRowActionsProps) => {
  const { items, disabled, disabledHint, align = 'end', contentClassName = 'w-[200px]' } = props;
  if (disabled) {
    const trigger = (
      <Button
        variant="ghost"
        className="flex h-8 w-8 p-0 opacity-50 data-[state=open]:bg-muted"
        disabled
      >
        <DotsHorizontalIcon className="h-4 w-4" />
      </Button>
    );
    if (!disabledHint) {
      return trigger;
    }
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent className="max-w-xs">{disabledHint}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <DotsHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={contentClassName}>
        {items.map((item, index) => (
          <ItemBlock key={item.key} item={item} isFirst={index === 0} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

ResourceRowActions.displayName = 'ResourceRowActions';

interface ItemBlockProps {
  item: ResourceRowActionItem;
  isFirst: boolean;
}

const ItemBlock = (props: ItemBlockProps) => {
  const { item, isFirst } = props;
  return (
    <>
      {item.separatorBefore && !isFirst ? <DropdownMenuSeparator /> : null}
      <DropdownMenuItem
        onClick={item.onSelect}
        disabled={item.disabled}
        className={
          item.destructive
            ? 'text-destructive focus:bg-destructive/10 focus:text-destructive'
            : undefined
        }
      >
        {item.icon}
        {item.label}
      </DropdownMenuItem>
    </>
  );
};
