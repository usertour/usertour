import type { Attribute, Content, ContentVersion, RulesCondition, Step } from '@usertour/types';
import type { Segment } from '@usertour/data';
import { useMemo } from 'react';
import { ActionList } from './action-list';
import { RulesZIndexProvider } from '@/components/rules';
import { ActionsProvider } from './actions-context';
import { DEFAULT_ACTION_TYPES } from './registry';
// Side-effect import: each schema module calls registerActionSchema() at
// module-load time. Importing the barrel here is the single point that
// guarantees every type is registered before <Actions> renders, regardless
// of which consumer triggers the load. Keep this import even though the
// barrel exports `{}` — the side effects are what we want.
import './types';

interface ActionsProps {
  // Controlled list. Parent owns the canonical state and reacts to onChange.
  conditions: RulesCondition[];
  onChange: (next: RulesCondition[]) => void;

  // Lookup data threaded into the actions context for type editors.
  attributes?: Attribute[];
  segments?: Segment[];
  contents?: Content[];
  currentContent?: Content;
  currentVersion?: ContentVersion;
  currentStep?: Step;

  // Optional create-step hook. The step-goto editor exposes "Add new step"
  // submenus when the surrounding builder is able to spawn one inline.
  createStep?: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;

  // Project token — required by editors that pick into the live document.
  token?: string;

  // Restricts which action types the add-action dropdown surfaces. When
  // omitted, falls back to DEFAULT_ACTION_TYPES (matches v1
  // actions-group.tsx default: hides LAUNCHER_DISMIS / CHECKLIST_DISMIS /
  // BANNER_DISMIS unless explicitly opted in).
  filterItems?: string[];

  disabled?: boolean;
  baseZIndex: number;

  // Override the "Add action" trigger label, e.g., contexts where the verb
  // shouldn't be "Add action" (button click → "Add button action").
  addLabelKey?: string;
}

// New actions editor. Drop-in replacement for v1 `ContentActions` at the
// data shape level (RulesCondition[] with ContentActionsItemType.* — SDK
// handlers untouched), with a controlled-state contract, schema-driven
// type registry, and the same visual language as the new Conditions
// component.
export function Actions({
  conditions,
  onChange,
  attributes,
  segments,
  contents,
  currentContent,
  currentVersion,
  currentStep,
  createStep,
  token,
  filterItems = DEFAULT_ACTION_TYPES,
  disabled = false,
  baseZIndex,
  addLabelKey = 'actions.actions.addAction',
}: ActionsProps) {
  const value = useMemo(
    () => ({
      attributes,
      segments,
      contents,
      currentContent,
      currentVersion,
      currentStep,
      createStep,
      token,
      filterItems,
      disabled,
      addLabelKey,
    }),
    [
      attributes,
      segments,
      contents,
      currentContent,
      currentVersion,
      currentStep,
      createStep,
      token,
      filterItems,
      disabled,
      addLabelKey,
    ],
  );

  return (
    <RulesZIndexProvider value={baseZIndex}>
      <ActionsProvider value={value}>
        <ActionList conditions={conditions} onChange={onChange} />
      </ActionsProvider>
    </RulesZIndexProvider>
  );
}
