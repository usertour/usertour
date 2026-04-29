import { RiArrowDownSLine } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import { cuid } from '@usertour/helpers';
import type { RulesCondition } from '@usertour/types';
import { Fragment, useState } from 'react';
import { AddConditionDropdown } from './add-condition-dropdown';
import { ConditionRow } from './condition-row';
import { useConditionsContext, useConditionsT } from './conditions-context';

type Logic = 'and' | 'or';

interface Props {
  conditions: RulesCondition[];
  onChange: (next: RulesCondition[]) => void;
  // Logic is stored on each condition's `operators` field — kept consistent
  // across all conditions in the same group. Default 'and' when conditions
  // are empty.
  className?: string;
  // Optional override for the filterItems context — only the listed types
  // are surfaced in the add-condition dropdown. Used by nested scopes like
  // an event's where-section that allow a different subset of types than
  // the outer Conditions tree.
  filterItems?: string[];
}

// Ensure every condition has a stable id for React keying and dedup.
const ensureIds = (conds: RulesCondition[]): RulesCondition[] =>
  conds.map((c) => (c.id ? c : { ...c, id: cuid() }));

const readLogic = (conds: RulesCondition[]): Logic => {
  const first = conds[0]?.operators;
  return first === 'or' ? 'or' : 'and';
};

const stampLogic = (conds: RulesCondition[], logic: Logic): RulesCondition[] =>
  conds.map((c) => ({ ...c, operators: logic }));

interface LogicTogglerProps {
  logic: Logic;
  onToggle: () => void;
  disabled: boolean;
}

// Horizontal-mode toggler. Single-button chip that flips on click — used as
// an inline separator between conditions in flex-wrap rows.
function LogicToggler({ logic, onToggle, disabled }: LogicTogglerProps) {
  const t = useConditionsT();
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-input/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-input hover:bg-muted/40 hover:text-foreground focus-visible:bg-muted/40 focus-visible:text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>{logic === 'and' ? t('conditions.logic.and') : t('conditions.logic.or')}</span>
      <RiArrowDownSLine className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

// Renders a flat list of conditions. Horizontal mode flows togglers and
// condition rows as independent flex-wrap siblings; vertical mode lays each
// row out as `[prefix] [condition]` with prefix being either an "If" label
// (first row, when isShowIf) or the same toggler chip used horizontally
// (subsequent rows). Recursively used for nested 'group' conditions.
export function ConditionList({
  conditions,
  onChange,
  className,
  filterItems: filterItemsOverride,
}: Props) {
  const { isHorizontal, isShowIf, disabled } = useConditionsContext();
  const t = useConditionsT();
  const items = ensureIds(conditions);
  const logic = readLogic(items);
  // Tracks the most recently added condition so the corresponding row can
  // auto-open its popover. Cleared by ConditionRow once consumed.
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  const handleToggleLogic = () => {
    const next: Logic = logic === 'and' ? 'or' : 'and';
    onChange(stampLogic(items, next));
  };

  const handleAdd = (newCondition: RulesCondition) => {
    const stamped = { ...newCondition, operators: logic };
    onChange([...items, stamped]);
    // Group has no popover — only auto-open editor types.
    if (newCondition.type !== 'group') {
      setPendingOpenId(newCondition.id);
    }
  };

  const clearPendingOpen = () => setPendingOpenId(null);

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, next: RulesCondition) => {
    onChange(items.map((c, i) => (i === index ? { ...next, operators: logic } : c)));
  };

  if (isHorizontal) {
    return (
      <div className={cn('flex w-full flex-wrap items-center gap-1.5', className)}>
        {items.map((condition, index) => (
          <Fragment key={condition.id ?? index}>
            {index > 0 && (
              <LogicToggler logic={logic} onToggle={handleToggleLogic} disabled={disabled} />
            )}
            <ConditionRow
              condition={condition}
              onChange={(next) => handleChange(index, next)}
              onRemove={() => handleRemove(index)}
              autoOpen={pendingOpenId === condition.id}
              onAutoOpened={clearPendingOpen}
              filterItems={filterItemsOverride}
            />
          </Fragment>
        ))}
        <AddConditionDropdown onSelect={handleAdd} filterItems={filterItemsOverride} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {items.map((condition, index) => {
        let prefix: React.ReactNode = null;
        if (index === 0 && isShowIf) {
          prefix = (
            <div className="inline-flex h-7.5 w-[60px] shrink-0 items-center justify-center rounded-lg border border-input/60 bg-secondary text-xs font-medium text-secondary-foreground shadow-sm">
              {t('conditions.logic.if')}
            </div>
          );
        } else if (index > 0) {
          prefix = <LogicToggler logic={logic} onToggle={handleToggleLogic} disabled={disabled} />;
        }

        return (
          <div key={condition.id ?? index} className="flex w-full items-start gap-2">
            {prefix}
            <div className="min-w-0 flex-1">
              <ConditionRow
                condition={condition}
                onChange={(next) => handleChange(index, next)}
                onRemove={() => handleRemove(index)}
                autoOpen={pendingOpenId === condition.id}
                onAutoOpened={clearPendingOpen}
                filterItems={filterItemsOverride}
              />
            </div>
          </div>
        );
      })}
      <AddConditionDropdown onSelect={handleAdd} filterItems={filterItemsOverride} />
    </div>
  );
}
