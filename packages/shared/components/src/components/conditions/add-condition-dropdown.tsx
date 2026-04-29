import { PlusIcon } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { cuid } from '@usertour/helpers';
import type { RulesCondition } from '@usertour/types';
import { useCallback, useRef } from 'react';
import { useConditionsContext, useConditionsT } from './conditions-context';
import { listAvailableSchemas } from './registry';
import {
  ConditionDropdownMenu,
  ConditionDropdownMenuContent,
  ConditionDropdownMenuItem,
  ConditionDropdownMenuTrigger,
} from './ui';

interface Props {
  // Called when the user picks a type from the dropdown. The caller appends
  // the new condition to its conditions list with the right `operators`
  // (and/or) for that group.
  onSelect: (condition: RulesCondition) => void;
  // Optional override for the filterItems context value — used by nested
  // contexts like an event's where-section that need to surface a different
  // type set than the outer Conditions tree.
  filterItems?: string[];
}

// "Add condition" trigger + popup of registered types. Filters by either the
// `filterItems` prop (if provided) or ConditionsContext.filterItems so the
// dropdown only shows what the surrounding scope wants exposed.
//
// Selection is deferred until the dropdown finishes closing — otherwise the
// click that picked the item also lands as a click-outside on the new
// condition's auto-opened popover and immediately closes it.
export function AddConditionDropdown({ onSelect, filterItems: filterItemsOverride }: Props) {
  const t = useConditionsT();
  const { filterItems: ctxFilter, disabled, isHorizontal } = useConditionsContext();
  const filterItems = filterItemsOverride ?? ctxFilter;
  const schemas = listAvailableSchemas(filterItems);

  const pendingSchemaRef = useRef<(typeof schemas)[number] | null>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open || !pendingSchemaRef.current) return;
      const schema = pendingSchemaRef.current;
      pendingSchemaRef.current = null;
      onSelect({
        id: cuid(),
        type: schema.type,
        data: schema.defaultData() as never,
      });
    },
    [onSelect],
  );

  return (
    <ConditionDropdownMenu onOpenChange={handleOpenChange}>
      <ConditionDropdownMenuTrigger asChild disabled={disabled}>
        {/* In horizontal flex-wrap rows the trigger sits beside chip-height
            siblings; matching that height (h-8) lets the link's icon+text
            visually center against neighboring chips instead of hugging the
            row's top edge under items-start. Vertical mode has nothing to
            align to, so the natural text height is fine. */}
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50',
            isHorizontal && 'h-8',
          )}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {t('conditions.actions.addCondition')}
        </button>
      </ConditionDropdownMenuTrigger>
      <ConditionDropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        {schemas.map((schema) => {
          const Icon = schema.Icon;
          return (
            <ConditionDropdownMenuItem
              key={schema.type}
              onSelect={() => {
                pendingSchemaRef.current = schema;
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(schema.labelKey)}
            </ConditionDropdownMenuItem>
          );
        })}
      </ConditionDropdownMenuContent>
    </ConditionDropdownMenu>
  );
}
