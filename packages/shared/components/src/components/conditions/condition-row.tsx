import { RiCloseLine } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import type { RulesCondition } from '@usertour/types';
import { useEffect, useState } from 'react';
import { useConditionsContext } from './conditions-context';
import { ConditionEditor } from './condition-editor';
import { ConditionList } from './condition-list';
import { getConditionSchema } from './registry';
import {
  ConditionIconButton,
  ConditionPopover,
  ConditionPopoverContent,
  ConditionPopoverTrigger,
} from './ui';

interface Props {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  onRemove: () => void;
  // When true, the row opens its popover on mount once. Used by ConditionList
  // after adding a new condition so the user lands directly in the editor
  // without an extra click.
  autoOpen?: boolean;
  onAutoOpened?: () => void;
}

// Outer chip: holds the trigger and the close button as one rounded unit
// joined by a 1px divider, so the close belongs visually to its condition
// instead of floating beside it.
const CHIP_OUTER =
  'group/condition inline-flex items-stretch overflow-hidden rounded-lg border border-input/60 bg-background text-xs shadow-sm transition-colors hover:border-input';

// One condition row. For 'group' types renders a recursive ConditionList
// inline (no popover). For all other registered types renders a summary
// button that opens the type's Editor in a popover.
export function ConditionRow({ condition, onChange, onRemove, autoOpen, onAutoOpened }: Props) {
  const { disabled, isHorizontal } = useConditionsContext();
  const [open, setOpen] = useState(false);
  const schema = getConditionSchema(condition.type);

  useEffect(() => {
    if (autoOpen && !disabled) {
      setOpen(true);
      onAutoOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  // In horizontal layout each chip sizes to its content; in vertical it
  // stretches to fill the surrounding container.
  const widthClass = isHorizontal ? 'max-w-full' : 'w-full';

  // Group is structurally different — its UI is a nested list, not a popover.
  if (condition.type === 'group') {
    return (
      <div
        className={cn(
          'group/condition relative rounded-lg border border-input/60 bg-background/40 p-2 shadow-sm',
          isHorizontal ? 'inline-block max-w-full' : 'w-full',
        )}
      >
        <ConditionList
          conditions={condition.conditions ?? []}
          onChange={(nextNested) => onChange({ ...condition, conditions: nextNested })}
        />
        {!disabled && (
          <ConditionIconButton
            aria-label="Remove group"
            onClick={onRemove}
            className="absolute right-1 top-1 opacity-0 transition-opacity group-hover/condition:opacity-100 focus-visible:opacity-100"
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </ConditionIconButton>
        )}
      </div>
    );
  }

  // Unknown type — render a placeholder so the user can still see and remove
  // it. Important for forward compatibility with old data that used a type
  // we've since removed.
  if (!schema) {
    return (
      <div
        className={cn(
          'inline-flex items-stretch overflow-hidden rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground',
          widthClass,
        )}
      >
        <span className="min-w-0 flex-1 truncate px-3 py-1.5">
          Unknown condition: {condition.type}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="flex w-7 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:outline-none"
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  const { Summary } = schema;

  return (
    <ConditionPopover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <div className={cn(CHIP_OUTER, widthClass)}>
        <ConditionPopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex min-w-0 items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
              isHorizontal ? '' : 'flex-1',
            )}
          >
            <Summary condition={condition} />
          </button>
        </ConditionPopoverTrigger>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove condition"
            className="flex w-7 shrink-0 items-center justify-center border-l border-input/60 text-muted-foreground/50 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60 focus-visible:text-foreground focus-visible:outline-none group-hover/condition:text-muted-foreground"
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <ConditionPopoverContent align="start" sideOffset={6} className="w-[300px]">
        <ConditionEditor
          schema={schema}
          condition={condition}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      </ConditionPopoverContent>
    </ConditionPopover>
  );
}
