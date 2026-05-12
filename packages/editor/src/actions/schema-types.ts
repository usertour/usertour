import type {
  Attribute,
  Content,
  ContentVersion,
  RulesCondition,
  Segment,
  Step,
} from '@usertour/types';
import type { ComponentType } from 'react';

// Validation context — passed to validate() so it can cross-check against the
// live attribute / content / step lists. Returning a translation key marks
// the action invalid; returning undefined means valid.
export interface ValidateContext {
  attributes?: Attribute[];
  segments?: Segment[];
  contents?: Content[];
  currentContent?: Content;
  currentVersion?: ContentVersion;
  currentStep?: Step;
}

export interface ValidationError {
  key: string;
  values?: Record<string, unknown>;
}

// Each action type implements one of these. `TData` parametrizes only the
// initial data factory — `Summary` and `Editor` receive the whole condition
// (data shape kept identical to v1 so SDK action-handlers continue to read
// `condition.data` directly without translation).
export interface ActionTypeSchema<TData = unknown> {
  // Matches `RulesCondition.type` — used for dispatch.
  type: string;
  // i18n key for the display name in the add-action dropdown.
  labelKey: string;
  // Permissive props bag because icons in this workspace come from a mix of
  // sources (remixicon, Radix, custom SVG) with subtly different prop
  // unions on width/height. Keeping the type loose avoids per-icon casts.
  Icon: ComponentType<{
    className?: string;
    width?: string | number;
    height?: string | number;
  }>;
  // Default `data` payload for a fresh action of this type.
  defaultData: () => TData;
  // Inline summary in the collapsed row (e.g., "Go to step 3").
  Summary: ComponentType<{ condition: RulesCondition }>;
  // Editor that opens in a popover when the row is clicked. Optional — types
  // with no configurable data (the four dismiss variants) omit it; ActionRow
  // then renders a static chip with no popover, and ActionList skips
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
  // strip in-flight UI artifacts so the persisted data never carries them
  // into the runtime.
  normalize?: (condition: RulesCondition) => RulesCondition;
  // Optional Tailwind width class for this type's popover editor. Default is
  // 300px; types with multi-row controls or rich-text fields opt to wider.
  editorWidthClassName?: string;
  // True when this action should never coexist with another instance of the
  // same type in the same list. Mirrors v1 actions-group.tsx behavior: only
  // JAVASCRIPT_EVALUATE was repeatable; every other type was single-use per
  // list. Defaults to singleton when omitted.
  repeatable?: boolean;
}

export type AnySchema = ActionTypeSchema<unknown>;
