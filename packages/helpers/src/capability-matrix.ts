import {
  ContentActionsItemType,
  ContentDataType,
  RulesType,
  StepContentType,
} from '@usertour/types';

/**
 * The capability matrix — the single source of truth for "which slot / content
 * type / step kind allows what". The same contract is enforced in three places
 * that historically each kept a hand-copied version (the recurring bug class:
 * the write API accepting inputs the builder never offers and the runtime
 * silently ignores):
 *  - the builder's per-container `filterItems` (packages/editor,
 *    packages/business-components, apps/web builder components);
 *  - the server's v2/MCP write guards (apps/server content-versions service,
 *    via the representation-name adapter in content-representation/contract-map);
 *  - the authoring guide / schema descriptions.
 * Change a rule HERE; consumers derive from these tables instead of restating
 * them. Vocabulary is the INTERNAL one (@usertour/types enums) — the v2
 * representation layer owns its own name mapping in the server codec.
 *
 * (AUTO_START_CAPABILITIES in ./content is the per-type auto-start half of the
 * same idea and predates this file; its tracker `conditionTypes` still uses
 * representation names — harmonizing it here is a follow-up.)
 */

/**
 * Condition types evaluated on the SERVER (against stored data / session
 * history), not observable live in the browser. Reactive slots — a step
 * trigger's `when`, a button's show/hide/disable rules, a tracker's start
 * conditions — are polled client-side mid-session, so these types can never
 * fire there and the builder omits them from those pickers. Everything else in
 * the general condition set is client-evaluable.
 */
export const SERVER_EVALUATED_CONDITION_TYPES: readonly RulesType[] = [
  RulesType.EVENT,
  RulesType.SEGMENT,
  RulesType.CONTENT,
];

/** Per-content-type action capabilities. */
export type ContentActionCapabilities = {
  /**
   * The action types this content type's action slots offer, in the builder's
   * display order. `step-goto` is flow-only (only a flow has steps to go to).
   */
  actions: readonly ContentActionsItemType[];
  /**
   * The host-specific dismiss variant this type's renderer registers, or null
   * when the type has no dismiss action at all (resource center: its built-in
   * close button dismisses it; tracker: headless, no action slots).
   */
  dismissVariant: ContentActionsItemType | null;
};

export const CONTENT_ACTION_CAPABILITIES: Record<ContentDataType, ContentActionCapabilities> = {
  [ContentDataType.FLOW]: {
    actions: [
      ContentActionsItemType.STEP_GOTO,
      ContentActionsItemType.FLOW_DISMIS,
      ContentActionsItemType.FLOW_START,
      ContentActionsItemType.PAGE_NAVIGATE,
      ContentActionsItemType.JAVASCRIPT_EVALUATE,
    ],
    dismissVariant: ContentActionsItemType.FLOW_DISMIS,
  },
  [ContentDataType.CHECKLIST]: {
    actions: [
      ContentActionsItemType.CHECKLIST_DISMIS,
      ContentActionsItemType.FLOW_START,
      ContentActionsItemType.PAGE_NAVIGATE,
      ContentActionsItemType.JAVASCRIPT_EVALUATE,
    ],
    dismissVariant: ContentActionsItemType.CHECKLIST_DISMIS,
  },
  [ContentDataType.LAUNCHER]: {
    actions: [
      ContentActionsItemType.LAUNCHER_DISMIS,
      ContentActionsItemType.JAVASCRIPT_EVALUATE,
      ContentActionsItemType.PAGE_NAVIGATE,
      ContentActionsItemType.FLOW_START,
    ],
    dismissVariant: ContentActionsItemType.LAUNCHER_DISMIS,
  },
  [ContentDataType.BANNER]: {
    actions: [
      ContentActionsItemType.BANNER_DISMIS,
      ContentActionsItemType.FLOW_START,
      ContentActionsItemType.PAGE_NAVIGATE,
      ContentActionsItemType.JAVASCRIPT_EVALUATE,
    ],
    dismissVariant: ContentActionsItemType.BANNER_DISMIS,
  },
  [ContentDataType.RESOURCE_CENTER]: {
    actions: [
      ContentActionsItemType.FLOW_START,
      ContentActionsItemType.PAGE_NAVIGATE,
      ContentActionsItemType.JAVASCRIPT_EVALUATE,
    ],
    dismissVariant: null,
  },
  [ContentDataType.TRACKER]: {
    // Headless — no content body, no action slots at all.
    actions: [],
    dismissVariant: null,
  },
};

/** Per-step-kind capabilities. */
export type StepCapabilities = {
  /**
   * How the step is positioned: `anchor` = `{side, align}` relative to its
   * target element (tooltip); `grid` = `{position}` on the 9-cell viewport
   * grid (modal); `theme` = position comes from the theme's bubble placement,
   * a step-level placement is ignored (bubble); `none` = no UI (hidden).
   */
  placement: 'anchor' | 'grid' | 'theme' | 'none';
  /** Click-the-target-element-to-advance — needs a target, so tooltip only. */
  onClick: boolean;
  /** Whether the step must carry a `target` element to render. */
  requiresTarget: boolean;
};

export const STEP_CAPABILITIES: Record<StepContentType, StepCapabilities> = {
  [StepContentType.TOOLTIP]: { placement: 'anchor', onClick: true, requiresTarget: true },
  [StepContentType.MODAL]: { placement: 'grid', onClick: false, requiresTarget: false },
  [StepContentType.BUBBLE]: { placement: 'theme', onClick: false, requiresTarget: false },
  [StepContentType.HIDDEN]: { placement: 'none', onClick: false, requiresTarget: false },
};

/**
 * The content types a cross-content reference may target — a content-state
 * condition, a start-flow action, a resource-center content-list item. Only
 * flows and checklists record the per-user seen/completed/active state these
 * references depend on; the builder's pickers list only these two.
 */
export const CONTENT_REFERENCE_TARGET_TYPES: readonly ContentDataType[] = [
  ContentDataType.FLOW,
  ContentDataType.CHECKLIST,
];
