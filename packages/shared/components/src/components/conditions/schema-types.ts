import type { Attribute, Content, Event, RulesCondition, Segment } from '@usertour/types';
import type { ComponentType } from 'react';

// Validation context — passed to validate() so it can cross-check against the
// live attribute / segment / content / event lists. Returning a translation
// key marks the condition invalid; returning undefined means valid.

export interface ValidateContext {
  attributes?: Attribute[];
  segments?: Segment[];
  contents?: Content[];
  events?: Event[];
}

export interface ValidationError {
  key: string;
  values?: Record<string, unknown>;
}

// Each rule type implements one of these. `TData` parametrizes only the
// initial data factory — `Summary` and `Editor` receive the whole condition
// because some types (group) need access to `condition.conditions` etc.

export interface ConditionTypeSchema<TData = unknown> {
  // Matches `RulesCondition.type` — used for dispatch.
  type: string;
  // i18n key for the display name in the add-condition dropdown.
  labelKey: string;
  Icon: ComponentType<{ className?: string }>;
  // Default `data` payload for a fresh condition of this type.
  defaultData: () => TData;
  // Optional default `conditions` for types that store nested rules (group).
  defaultConditions?: () => RulesCondition[];
  // Inline summary in the collapsed row (e.g., "Email is x@y.com").
  Summary: ComponentType<{ condition: RulesCondition }>;
  // Editor that opens in a popover when the row is clicked. Optional — types
  // with no configurable data (e.g., 'task-is-clicked') omit it; ConditionRow
  // then renders a static chip with no popover, and ConditionList skips
  // auto-open after adding one.
  Editor?: ComponentType<{
    condition: RulesCondition;
    onChange: (next: RulesCondition) => void;
    onClose: () => void;
  }>;
  // Returns a validation error or undefined.
  validate?: (condition: RulesCondition, ctx: ValidateContext) => ValidationError | undefined;
  // Optional: normalize the condition before it's committed to the parent.
  // Called once on popover close, ahead of validate / onChange. Use this to
  // strip in-flight UI artifacts (e.g., empty list rows the editor leaves in
  // place to keep the "+ Add value" affordance usable) so the persisted data
  // never carries them into the runtime.
  normalize?: (condition: RulesCondition) => RulesCondition;
}

export type AnySchema = ConditionTypeSchema<unknown>;
