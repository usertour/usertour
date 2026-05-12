import { PlusIcon } from '@usertour-packages/icons';
import { cuid } from '@usertour/helpers';
import type { RulesCondition } from '@usertour/types';
import { useCallback, useRef } from 'react';
import { useActionsContext, useActionsT } from './actions-context';
import { getMutuallyExcluded } from './mutex';
import { listAvailableSchemas } from './registry';
import {
  ActionDropdownMenu,
  ActionDropdownMenuContent,
  ActionDropdownMenuItem,
  ActionDropdownMenuTrigger,
} from './ui';

interface Props {
  // Called when the user picks a type. The caller appends the new condition
  // to its actions list and the row auto-opens its editor (if any).
  onSelect: (condition: RulesCondition) => void;
  // Types already present in the list — used to hide singleton types from
  // the dropdown once they've been added. Repeatable types stay surfaced.
  existingTypes: string[];
}

// "Add action" trigger + popup of registered, scope-filtered action types.
// Selection is deferred until the dropdown finishes closing — otherwise the
// click that picked the item also lands as a click-outside on the new
// action's auto-opened popover and immediately closes it (matches
// AddConditionDropdown).
export function AddActionDropdown({ onSelect, existingTypes }: Props) {
  const t = useActionsT();
  const { filterItems, disabled, addLabelKey } = useActionsContext();
  const excluded = getMutuallyExcluded(existingTypes);
  const schemas = listAvailableSchemas(filterItems).filter((schema) => {
    if (excluded.has(schema.type)) return false;
    if (schema.repeatable) return true;
    return !existingTypes.includes(schema.type);
  });

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

  // Hide the trigger entirely when nothing's left to add. Otherwise an
  // empty popup would surface and the click would silently no-op — worse
  // UX than removing the affordance.
  if (schemas.length === 0) return null;

  return (
    <ActionDropdownMenu onOpenChange={handleOpenChange}>
      <ActionDropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-8 items-center gap-1 rounded text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {t(addLabelKey)}
        </button>
      </ActionDropdownMenuTrigger>
      <ActionDropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        {schemas.map((schema) => {
          const Icon = schema.Icon;
          return (
            <ActionDropdownMenuItem
              key={schema.type}
              onSelect={() => {
                pendingSchemaRef.current = schema;
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(schema.labelKey)}
            </ActionDropdownMenuItem>
          );
        })}
      </ActionDropdownMenuContent>
    </ActionDropdownMenu>
  );
}
