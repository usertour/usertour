import { cuid } from '@usertour/helpers';
import type { RulesCondition } from '@usertour/types';
import { useEffect, useMemo, useState } from 'react';
import { ActionRow } from './action-row';
import { AddActionDropdown } from './add-action-dropdown';
import { getActionSchema } from './registry';

interface Props {
  conditions: RulesCondition[];
  onChange: (next: RulesCondition[]) => void;
}

// Backfill missing ids without re-rolling them on every render. Mirrors
// ConditionList.ensureIds — keeps React keys stable across renders so a
// row's local draft / errorKey / open state survives parent re-renders.
const ensureIds = (conds: RulesCondition[]): RulesCondition[] => {
  if (conds.every((c) => Boolean(c.id))) return conds;
  return conds.map((c) => (c.id ? c : { ...c, id: cuid() }));
};

// Renders a flat list of actions. No 'and/or' connectors, no group nesting,
// and no 'if' prefix — the runtime fires every action in order, so the UI
// just stacks one row per action with the add-action affordance underneath.
export function ActionList({ conditions, onChange }: Props) {
  const items = useMemo(() => ensureIds(conditions), [conditions]);

  useEffect(() => {
    if (items !== conditions) {
      onChange(items);
    }
  }, [items, conditions, onChange]);

  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  const existingTypes = useMemo(() => items.map((item) => item.type), [items]);

  const handleAdd = (newAction: RulesCondition) => {
    onChange([...items, newAction]);
    // Editor-less schemas (the four dismiss variants) skip auto-open —
    // there's nothing to configure, so the user lands on a static chip.
    const schema = getActionSchema(newAction.type);
    if (schema?.Editor) {
      setPendingOpenId(newAction.id);
    }
  };

  const clearPendingOpen = () => setPendingOpenId(null);

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, next: RulesCondition) => {
    onChange(items.map((c, i) => (i === index ? next : c)));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((condition, index) => (
        <ActionRow
          key={condition.id ?? index}
          condition={condition}
          onChange={(next) => handleChange(index, next)}
          onRemove={() => handleRemove(index)}
          autoOpen={pendingOpenId === condition.id}
          onAutoOpened={clearPendingOpen}
        />
      ))}
      <AddActionDropdown onSelect={handleAdd} existingTypes={existingTypes} />
    </div>
  );
}
