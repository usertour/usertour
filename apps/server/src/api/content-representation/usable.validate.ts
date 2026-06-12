import { hasMissingRequiredData } from '@usertour/helpers';
import {
  BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT,
  type BannerData,
  type ChecklistData,
  ContentActionsItemType,
  ContentDataType,
  type ContentEditorRoot,
  type ElementSelectorPropsData,
  LauncherActionType,
  type LauncherData,
  type ResourceCenterData,
  ResourceCenterBlockType,
  type RulesCondition,
  type Step,
  StepContentType,
} from '@usertour/types';

/**
 * Strict "is this content usable?" validator for the v2 API/MCP.
 *
 * The web builder is lenient (its only hard publish gates are flow≥1-step and
 * tracker), leaning on live preview + silent defaults that an agent never gets.
 * The SDK then silently renders nothing when a required field is missing — a
 * themeless version, a tooltip with no target, an empty checklist. This mirrors
 * the SDK's actual render requirements so those silent failures become explicit,
 * fixable errors at publish (and via the dry-run endpoint). The bar is the
 * runtime, NOT the builder — we deliberately reject things the builder allows.
 */

export type Severity = 'error' | 'warning';

export interface UsabilityIssue {
  severity: Severity;
  /** Where the problem is, e.g. `steps[2] "Sidebar"` or `items[0]`. */
  path: string;
  message: string;
}

export interface UsabilityReport {
  ok: boolean;
  errors: UsabilityIssue[];
  warnings: UsabilityIssue[];
}

export interface ValidateUsableInput {
  /** Content type (ContentDataType value). */
  type: string;
  themeId: string | null | undefined;
  /** Flow steps (compiled, with `data` as ContentEditorRoot[]). */
  steps?: Step[] | null;
  /** Non-flow version data (the compiled @usertour/types model, parsed). */
  data?: unknown;
  /** version.config (carries autoStartRules). */
  config?: { autoStartRules?: RulesCondition[] | null } | null;
}

// UI content types that render and therefore require a theme. Tracker is the
// only headless type (it fires an event, no UI).
const UI_TYPES = new Set<string>([
  ContentDataType.FLOW,
  ContentDataType.CHECKLIST,
  ContentDataType.LAUNCHER,
  ContentDataType.BANNER,
  ContentDataType.RESOURCE_CENTER,
]);

/** Whether a content type renders UI and therefore needs a theme (everything but tracker). */
export function requiresTheme(type: string): boolean {
  return UI_TYPES.has(type);
}

/** A target is usable if it resolves to an element (auto selectors or a manual selector). */
function hasTarget(target?: ElementSelectorPropsData): boolean {
  return Boolean(target && (target.selectors || (target.customSelector ?? '').trim()));
}

/** True when the block tree has at least one element to render. */
function hasBlocks(roots?: ContentEditorRoot[] | null): boolean {
  return (
    Array.isArray(roots) &&
    roots.some((group) =>
      Array.isArray(group?.children)
        ? group.children.some((col) => Array.isArray(col?.children) && col.children.length > 0)
        : false,
    )
  );
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Parse a Json column that may arrive as an object or a JSON string. */
function parseData<T>(data: unknown): T | null {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }
  return data as T;
}

/** Deep-walk any value collecting `step-goto` action targets (stepCvid). */
function collectGotoTargets(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectGotoTargets(item, out);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (obj.type === ContentActionsItemType.STEP_GOTO) {
      const cvid = (obj.data as { stepCvid?: unknown } | undefined)?.stepCvid;
      if (typeof cvid === 'string' && cvid) out.push(cvid);
    }
    for (const key of Object.keys(obj)) collectGotoTargets(obj[key], out);
  }
}

export function validateVersionUsable(input: ValidateUsableInput): UsabilityReport {
  const errors: UsabilityIssue[] = [];
  const warnings: UsabilityIssue[] = [];
  const err = (path: string, message: string) => errors.push({ severity: 'error', path, message });
  const warn = (path: string, message: string) =>
    warnings.push({ severity: 'warning', path, message });

  // Theme: required for every UI type — the SDK renders nothing without one.
  if (UI_TYPES.has(input.type) && !input.themeId) {
    err('theme', 'Content has no theme; the SDK cannot render it. Set a themeId.');
  }

  switch (input.type) {
    case ContentDataType.FLOW:
      validateFlow(asArray<Step>(input.steps), err, warn);
      break;
    case ContentDataType.CHECKLIST:
      validateChecklist(parseData<ChecklistData>(input.data), err);
      break;
    case ContentDataType.LAUNCHER:
      validateLauncher(parseData<LauncherData>(input.data), err);
      break;
    case ContentDataType.BANNER:
      validateBanner(parseData<BannerData>(input.data), err);
      break;
    case ContentDataType.RESOURCE_CENTER:
      validateResourceCenter(parseData<ResourceCenterData>(input.data), err);
      break;
    case ContentDataType.TRACKER:
      validateTracker(parseData<Record<string, unknown>>(input.data), input.config, err);
      break;
    default:
      break;
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validateFlow(
  steps: Step[],
  err: (path: string, message: string) => void,
  warn: (path: string, message: string) => void,
): void {
  if (steps.length === 0) {
    err('steps', 'Flow has no steps.');
    return;
  }

  const cvids = new Set(steps.map((s) => s.cvid).filter(Boolean) as string[]);
  const referenced = new Set<string>();

  steps.forEach((step, i) => {
    const label = `steps[${i}]${step.name ? ` "${step.name}"` : ''}`;

    // Only tooltip steps need a target; modal/bubble/hidden anchor to the page.
    if (step.type === StepContentType.TOOLTIP && !hasTarget(step.target)) {
      err(label, 'Tooltip step has no target element; the SDK skips it.');
    }

    // Hidden steps carry only logic (no rendered body); every other step must
    // have content and no element missing its required data.
    if (step.type !== StepContentType.HIDDEN) {
      const roots = (step.data as ContentEditorRoot[] | undefined) ?? [];
      if (!hasBlocks(roots)) {
        err(label, 'Step has no content blocks; it renders blank.');
      } else if (hasMissingRequiredData(roots)) {
        err(
          label,
          'Step has an element missing required data (a button needs text and an action; a question needs a name).',
        );
      }
    }

    // goto_step references must resolve to a step that exists in this version.
    const targets: string[] = [];
    collectGotoTargets(step, targets);
    for (const cvid of targets) {
      referenced.add(cvid);
      if (!cvids.has(cvid)) {
        err(label, `A "go to step" action points at a step that does not exist (${cvid}).`);
      }
    }
  });

  // Reachability is advisory: a non-first step that nothing navigates to is
  // likely dead, but may be reached via runtime triggers we can't see here.
  steps.forEach((step, i) => {
    if (i === 0 || !step.cvid) return;
    if (!referenced.has(step.cvid)) {
      warn(
        `steps[${i}]${step.name ? ` "${step.name}"` : ''}`,
        'Step is not reachable from any other step (no "go to step" points to it).',
      );
    }
  });
}

function validateChecklist(
  data: ChecklistData | null,
  err: (path: string, message: string) => void,
): void {
  const items = asArray<ChecklistData['items'][number]>(data?.items);
  if (items.length === 0) {
    err('items', 'Checklist has no items.');
    return;
  }
  items.forEach((item, i) => {
    const label = `items[${i}]${item?.name ? ` "${item.name}"` : ''}`;
    if (!item?.name || !item.name.trim()) {
      err(label, 'Checklist item has no name.');
    }
    const clicked = asArray<RulesCondition>(item?.clickedActions);
    const complete = asArray<RulesCondition>(item?.completeConditions);
    if (clicked.length === 0 && complete.length === 0) {
      err(
        label,
        'Checklist item does nothing: it has no click action and no completion condition.',
      );
    }
  });
}

function validateLauncher(
  data: LauncherData | null,
  err: (path: string, message: string) => void,
): void {
  if (!hasTarget(data?.target?.element)) {
    err('target', 'Launcher has no target element to anchor to; it never shows.');
  }
  const actionType = data?.behavior?.actionType;
  // SHOW_TOOLTIP needs tooltip content; PERFORM_ACTION needs actions.
  if (actionType === LauncherActionType.SHOW_TOOLTIP) {
    if (!hasBlocks(data?.tooltip?.content as ContentEditorRoot[] | undefined)) {
      err('tooltip.content', 'Launcher tooltip has no content.');
    }
  } else if (actionType === LauncherActionType.PERFORM_ACTION) {
    if (asArray<RulesCondition>(data?.behavior?.actions).length === 0) {
      err('behavior.actions', 'Launcher click performs no action.');
    }
  }
}

function validateBanner(
  data: BannerData | null,
  err: (path: string, message: string) => void,
): void {
  if (!hasBlocks(data?.contents)) {
    err('contents', 'Banner has no content; it renders blank.');
  }
  if (
    data?.embedPlacement &&
    BANNER_EMBED_PLACEMENTS_REQUIRING_ELEMENT.includes(data.embedPlacement) &&
    !hasTarget(data.containerElement)
  ) {
    err(
      'containerElement',
      'Banner placement is element-relative but has no container element; it never shows.',
    );
  }
}

function validateResourceCenter(
  data: ResourceCenterData | null,
  err: (path: string, message: string) => void,
): void {
  const tabs = asArray<ResourceCenterData['tabs'][number]>(data?.tabs);
  if (tabs.length === 0) {
    err('tabs', 'Resource center has no tabs.');
    return;
  }
  tabs.forEach((tab, i) => {
    const label = `tabs[${i}]${tab?.name ? ` "${tab.name}"` : ''}`;
    if (!tab?.name || !String(tab.name).trim()) {
      err(label, 'Resource center tab has no name.');
    }
    if (!tabHasRenderableBlock(asArray(tab?.blocks))) {
      err(label, 'Resource center tab has no content blocks.');
    }
  });
}

/** A tab is empty unless it has a block that actually shows or does something. */
function tabHasRenderableBlock(blocks: unknown[]): boolean {
  return blocks.some((raw) => {
    const block = raw as { type?: string; content?: ContentEditorRoot[]; contentItems?: unknown[] };
    switch (block?.type) {
      case ResourceCenterBlockType.RICH_TEXT:
      case ResourceCenterBlockType.SUB_PAGE:
        return hasBlocks(block.content);
      case ResourceCenterBlockType.CONTENT_LIST:
        return asArray(block.contentItems).length > 0;
      case ResourceCenterBlockType.ACTION:
      case ResourceCenterBlockType.LIVE_CHAT:
        return true; // actionable / interactive blocks
      default:
        return false; // dividers and unknowns don't count as content
    }
  });
}

function validateTracker(
  data: Record<string, unknown> | null,
  config: ValidateUsableInput['config'],
  err: (path: string, message: string) => void,
): void {
  if (!data?.eventId) {
    err('eventId', 'Tracker has no event to fire.');
  }
  if (asArray<RulesCondition>(config?.autoStartRules).length === 0) {
    err('autoStartRules', 'Tracker has no trigger conditions.');
  }
}
