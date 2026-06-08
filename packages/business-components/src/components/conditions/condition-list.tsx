import { RiArrowDownSLine } from '@usertour/icons';
import { cn } from '@usertour/tailwind';
import { cuid } from '@usertour/helpers';
import type { RulesCondition } from '@usertour/types';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { AddConditionDropdown } from './add-condition-dropdown';
import { ConditionRow } from './condition-row';
import { useConditionsContext, useConditionsT } from './conditions-context';
import { getConditionSchema } from './registry';

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
  // True when this list belongs to a nested group. Forwarded to the
  // add-condition dropdown so 'group' is hidden one level down, capping
  // group nesting at depth 1 (matches v1 RulesGroup).
  isNested?: boolean;
  // Label for the first row's leading badge in vertical mode. Defaults to
  // 'if' (the conditional intro: "If [x] AND [y]"). Use 'where' inside an
  // event filter so the chip reads "Where [x] AND [y]" — distinct from the
  // outer If clause and aligned with SQL-style where-clause semantics.
  // Only the immediate top-level row gets this badge; nested groups keep
  // their own list semantics ([If]) regardless of the parent context.
  firstRowLabel?: 'if' | 'where';
}

// Backfill missing ids without re-rolling them on every render. Only mints
// new cuids when at least one condition lacks an id, and returns the input
// reference unchanged otherwise so downstream useMemo / useEffect deps stay
// stable.
const ensureIds = (conds: RulesCondition[]): RulesCondition[] => {
  if (conds.every((c) => Boolean(c.id))) return conds;
  return conds.map((c) => (c.id ? c : { ...c, id: cuid() }));
};

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
  isHorizontal: boolean;
}

// AND/OR connector chip. In horizontal flex-wrap layouts every element ends
// up on the same line as a chip, so we keep the toggler at chip size for an
// even pill rhythm. In vertical column layouts each row is `[connector]
// [chip]`, where matching the chip's size gives the connector too much
// weight — so we shrink it one tier (rounded-md / h-6 / text-[11px]) to
// reinforce that AND/OR is grammar, subordinate to the chip it links.
function LogicToggler({ logic, onToggle, disabled, isHorizontal }: LogicTogglerProps) {
  const t = useConditionsT();
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 shadow-sm border border-input/60 bg-card font-medium text-muted-foreground transition-colors hover:border-input hover:bg-muted/40 hover:text-foreground focus-visible:bg-muted/40 focus-visible:text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
        isHorizontal
          ? 'rounded-lg px-3 py-1.5 text-sm items-center gap-1'
          : 'h-6 rounded-md px-2 text-[11px] items-center gap-0.5',
      )}
    >
      <span>{logic === 'and' ? t('conditions.logic.and') : t('conditions.logic.or')}</span>
      <RiArrowDownSLine className={cn('opacity-60', isHorizontal ? 'h-3.5 w-3.5' : 'h-3 w-3')} />
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
  isNested,
  firstRowLabel = 'if',
}: Props) {
  const { isHorizontal, isShowIf, disabled } = useConditionsContext();
  const t = useConditionsT();
  // Memoize the id-backfill so the same cuid sticks across rerenders for a
  // given conditions reference. Otherwise legacy data missing ids would get
  // a fresh cuid every render — the React key would change, ConditionRow
  // would unmount/remount, and the row's draft / errorKey / open state
  // would reset on any unrelated parent rerender.
  const items = useMemo(() => ensureIds(conditions), [conditions]);
  const logic = readLogic(items);

  // Persist the backfilled ids to the parent so subsequent updates to
  // `conditions` don't lose them and we don't have to fix up the same
  // missing-id list repeatedly. Runs only when ensureIds actually allocated
  // new cuids (items !== conditions).
  useEffect(() => {
    if (items !== conditions) {
      onChange(items);
    }
  }, [items, conditions, onChange]);
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
    // Auto-open the popover only when the schema has an Editor — group is
    // a recursive list, and editor-less types (e.g., task-is-clicked) are
    // static chips, neither has anything to open.
    const schema = getConditionSchema(newCondition.type);
    if (newCondition.type !== 'group' && schema?.Editor) {
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
      // items-start (not items-center) so an AND/OR connector sits next to
      // the FIRST line of a chip whose text wrapped — items-center would
      // float the connector to the chip's vertical midpoint, breaking the
      // "AND modifies the chip that follows it" reading. Mirrors v1's
      // rules-group.tsx flex-wrap layout.
      <div className={cn('flex w-full flex-wrap items-start gap-1.5', className)}>
        {items.map((condition, index) => (
          <Fragment key={condition.id ?? index}>
            {index > 0 && (
              <LogicToggler
                logic={logic}
                onToggle={handleToggleLogic}
                disabled={disabled}
                isHorizontal={isHorizontal}
              />
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
        <AddConditionDropdown
          onSelect={handleAdd}
          filterItems={filterItemsOverride}
          isNested={isNested}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {items.map((condition, index) => {
        let prefix: React.ReactNode = null;
        if (index === 0 && isShowIf) {
          // Static "If" / "Where" label — shrunk to match the AND/OR toggler
          // one tier so prefix-to-chip rhythm is consistent and the
          // connectors read as a column of like-sized pills. "Where" is
          // chosen by the event filter editor so the role of this list
          // (filter clause vs. top-level conditional) is visible without a
          // separate section header.
          prefix = (
            <div className="inline-flex h-6 min-w-[44px] shrink-0 items-center justify-center rounded-md border border-input/60 bg-secondary px-1.5 text-[11px] font-medium text-secondary-foreground shadow-sm">
              {t(`conditions.logic.${firstRowLabel}`)}
            </div>
          );
        } else if (index > 0) {
          prefix = (
            <LogicToggler
              logic={logic}
              onToggle={handleToggleLogic}
              disabled={disabled}
              isHorizontal={isHorizontal}
            />
          );
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
      <AddConditionDropdown
        onSelect={handleAdd}
        filterItems={filterItemsOverride}
        isNested={isNested}
      />
    </div>
  );
}
