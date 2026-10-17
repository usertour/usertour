import type { Attribute, Content, Event, RulesCondition } from '@usertour/types';
import type { Segment } from '@usertour/data';
import { useMemo } from 'react';
import { ConditionList } from './condition-list';
import { RulesZIndexProvider } from '@/components/rules';
import { ConditionsProvider } from './conditions-context';
import { DEFAULT_CONDITION_TYPES } from './registry';

interface ConditionsProps {
  // Controlled list. The new component does not maintain a default-only
  // pattern — parent owns the canonical state and reacts to onChange.
  conditions: RulesCondition[];
  onChange: (next: RulesCondition[]) => void;

  // Behavior flags — same semantics as v1 Rules, just a re-shaped API.
  isHorizontal?: boolean;
  isShowIf?: boolean;
  // Narrow-host mode: stack group / nested-row prefixes above their chip so
  // nested groups keep a readable text width. Pass from hosts whose panel is
  // too tight for the two-column rhythm (the 320px builder trigger sidebar);
  // see ConditionsContextValue.narrow.
  narrow?: boolean;
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

// New conditions editor. Drop-in replacement for v1 `Rules` at the API level
// (data shape unchanged), with a controlled-state contract, schema-driven
// type registry, and visual rhythm aligned with the theme builder v2 chrome.
export function Conditions({
  conditions,
  onChange,
  isHorizontal = false,
  isShowIf = true,
  narrow = false,
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
  addLabelKey = 'conditions.actions.addCondition',
  autoOpenAddMenu,
  onAddMenuClose,
}: ConditionsProps) {
  const value = useMemo(
    () => ({
      attributes,
      segments,
      contents,
      currentContent,
      events,
      isHorizontal,
      isShowIf,
      narrow,
      filterItems,
      disabled,
      saveBuildUrl,
      onElementChange,
      token,
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
      narrow,
      filterItems,
      disabled,
      saveBuildUrl,
      onElementChange,
      token,
      addLabelKey,
    ],
  );

  return (
    <RulesZIndexProvider value={baseZIndex}>
      <ConditionsProvider value={value}>
        <ConditionList
          conditions={conditions}
          onChange={onChange}
          autoOpenAddMenu={autoOpenAddMenu}
          onAddMenuClose={onAddMenuClose}
        />
      </ConditionsProvider>
    </RulesZIndexProvider>
  );
}
