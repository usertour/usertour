import type { Attribute, Content, Event, RulesCondition, Segment } from '@usertour/types';
import { useMemo } from 'react';
import { ConditionList } from './condition-list';
import { ConditionsProvider, type ConditionsTranslator } from './conditions-context';
import { DEFAULT_CONDITION_TYPES } from './registry';

interface ConditionsProps {
  // Controlled list. The new component does not maintain a default-only
  // pattern — parent owns the canonical state and reacts to onChange.
  conditions: RulesCondition[];
  onChange: (next: RulesCondition[]) => void;

  // Behavior flags — same semantics as v1 Rules, just a re-shaped API.
  isHorizontal?: boolean;
  isShowIf?: boolean;
  filterItems?: string[];

  // Lookup data threaded into the conditions context for type editors.
  attributes?: Attribute[];
  segments?: Segment[];
  contents?: Content[];
  currentContent?: Content;
  events?: Event[];

  // Element selector integration (used by the 'element' condition type).
  saveBuildUrl?: () => boolean;
  onElementChange?: (conditionIndex: number, type: string) => void;
  token?: string;

  disabled?: boolean;
  baseZIndex: number;

  // Optional translator. If omitted, translation keys pass through unchanged.
  // Apps wire this with the `t` from `useTranslation()`.
  t?: ConditionsTranslator;

  // Override for the "Add condition" trigger label. Filter-shaped contexts
  // (segment / data-table filtering) pass `'conditions.actions.addFilter'`
  // so the verb reads as "Add filter" — gating contexts (autostart, button
  // disable, RC block display) keep the default condition phrasing.
  addLabelKey?: string;

  // Open the top-level add-condition menu immediately on mount, and report
  // when it closes (`selected` = a type was picked). For hosts whose "Add
  // filter" entry point reveals this component: auto-opening collapses their
  // two-click flow into one, and a close-without-selection lets them undo
  // the reveal instead of stranding an empty bar. Nested group lists are
  // unaffected.
  autoOpenAddMenu?: boolean;
  onAddMenuClose?: (selected: boolean) => void;
}

const defaultTranslator: ConditionsTranslator = (key) => key;

// New conditions editor. Drop-in replacement for v1 `Rules` at the API level
// (data shape unchanged), with a controlled-state contract, schema-driven
// type registry, and visual rhythm aligned with the theme builder v2 chrome.
export function Conditions({
  conditions,
  onChange,
  isHorizontal = false,
  isShowIf = true,
  // Default mirrors v1 `defaultRulesItems` so consumers that don't pass
  // filterItems get the same dropdown set v1 produced — task-is-clicked
  // stays hidden unless explicitly opted in.
  filterItems = DEFAULT_CONDITION_TYPES,
  attributes,
  segments,
  contents,
  currentContent,
  events,
  saveBuildUrl,
  onElementChange,
  token,
  disabled = false,
  baseZIndex,
  t,
  addLabelKey = 'conditions.actions.addCondition',
  autoOpenAddMenu,
  onAddMenuClose,
}: ConditionsProps) {
  const translator = t ?? defaultTranslator;
  const value = useMemo(
    () => ({
      attributes,
      segments,
      contents,
      currentContent,
      events,
      isHorizontal,
      isShowIf,
      filterItems,
      disabled,
      baseZIndex,
      saveBuildUrl,
      onElementChange,
      token,
      t: translator,
      addLabelKey,
    }),
    [
      attributes,
      segments,
      contents,
      currentContent,
      events,
      isHorizontal,
      isShowIf,
      filterItems,
      disabled,
      baseZIndex,
      saveBuildUrl,
      onElementChange,
      token,
      translator,
      addLabelKey,
    ],
  );

  return (
    <ConditionsProvider value={value}>
      <ConditionList
        conditions={conditions}
        onChange={onChange}
        autoOpenAddMenu={autoOpenAddMenu}
        onAddMenuClose={onAddMenuClose}
      />
    </ConditionsProvider>
  );
}
