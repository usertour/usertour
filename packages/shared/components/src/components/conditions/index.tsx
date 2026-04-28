import type { Attribute, Content, Event, RulesCondition, Segment } from '@usertour/types';
import { useMemo } from 'react';
import { ConditionList } from './condition-list';
import { ConditionsProvider, type ConditionsTranslator } from './conditions-context';

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
  filterItems = [],
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
    ],
  );

  return (
    <ConditionsProvider value={value}>
      <ConditionList conditions={conditions} onChange={onChange} />
    </ConditionsProvider>
  );
}
