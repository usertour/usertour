import { type ValidateContext, hasMissingRequiredData } from '@usertour/helpers';
import { collectRuleIssues } from './condition-validate';
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
  /**
   * Project reference lists for SEMANTIC condition validation (attribute
   * datatype/op fit + existence; segment / content existence; required values).
   * When present, every condition in config / data / steps is checked. Omit to
   * skip condition validation (e.g. callers that only care about renderability).
   */
  conditionContext?: ValidateContext;
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

// Types that appear ONLY when their auto-start conditions match — they have no
// session-resume first-show path (Banner is re-evaluated every toggle; Launcher
// and Resource Center need auto-start to create the first session). With an empty
// rule set the runtime's isEnabledAutoStartRules bails, so the content can never
// surface on its own — but publish still succeeds. Flow/Checklist are excluded:
// they routinely resume sessions and are commonly started via usertour.start().
const AUTO_START_REQUIRED_TYPES = new Set<string>([
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

// Question element types whose range must satisfy the widget's contract
// (validateScaleRange in @usertour/widget: low ≤ high, low ≥ 0, high ≤ 100).
const QUESTION_RANGE_TYPES = new Set(['scale', 'star-rating']);

/**
 * Deep-walk a compiled block tree and flag question elements whose type-specific
 * config would render broken: a scale/rating range that isn't low ≤ high within
 * 0–100, or a multiple-choice with no options. The builder's question editors
 * enforce these; the API has no editor, so an agent can author an unanswerable
 * question that compiles fine and renders empty.
 */
function collectQuestionIssues(
  value: unknown,
  path: string,
  err: (path: string, message: string) => void,
): void {
  if (Array.isArray(value)) {
    for (const item of value) collectQuestionIssues(item, path, err);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const obj = value as Record<string, unknown>;
  const el = obj.element as { type?: unknown; data?: Record<string, unknown> } | undefined;
  if (el && typeof el.type === 'string') {
    const d = el.data ?? {};
    if (QUESTION_RANGE_TYPES.has(el.type)) {
      const low = d.lowRange;
      const high = d.highRange;
      if (
        typeof low === 'number' &&
        typeof high === 'number' &&
        !(low <= high && low >= 0 && high <= 100)
      ) {
        err(path, 'rating/scale question range must be low ≤ high within 0–100.');
      }
    } else if (el.type === 'multiple-choice') {
      if (!Array.isArray(d.options) || d.options.length === 0) {
        err(path, 'multiple-choice question needs at least one option.');
      }
    }
  }
  for (const key of Object.keys(obj)) collectQuestionIssues(obj[key], path, err);
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
      validateTracker(
        parseData<Record<string, unknown>>(input.data),
        input.config,
        input.conditionContext,
        err,
      );
      break;
    default:
      break;
  }

  // Auto-start gate: a Launcher / Banner / Resource Center with no start rules can
  // never appear on its own (see AUTO_START_REQUIRED_TYPES) yet publishes fine — the
  // silent "I published it and nothing shows" trap. Warn, not error: it can still be
  // launched via usertour.start().
  if (AUTO_START_REQUIRED_TYPES.has(input.type)) {
    const rules = input.config?.autoStartRules;
    if (!rules || rules.length === 0) {
      const extra =
        input.type === ContentDataType.RESOURCE_CENTER
          ? ' Its launcher never shows and openResourceCenter() stays a no-op until a session exists.'
          : '';
      warn(
        'config.autoStartRules',
        `${input.type} has no start rules, so it never appears on its own — it surfaces only when its auto-start conditions match.${extra} Add at least one auto-start condition; for an always-available surface use a permissive current_url match. It can still be launched programmatically via usertour.start().`,
      );
    }
  }

  // Question config (renderability — always checked) across steps + non-flow data.
  collectQuestionIssues(input.data, 'data', err);
  {
    const qSteps = asArray<Step>(input.steps);
    for (let i = 0; i < qSteps.length; i++) {
      const s = qSteps[i];
      const label = (s as { name?: string })?.name;
      const base = `steps[${i}]${label ? ` "${label}"` : ''}`;
      collectQuestionIssues((s as { data?: unknown }).data, base, err);
    }
  }

  // Semantic condition validation across every place conditions live (start /
  // hide rules in config, step triggers + button conditions in steps, item /
  // block conditions in data). Only when the caller supplies the reference lists.
  if (input.conditionContext) {
    const ctx = input.conditionContext;
    const push = (issues: { path: string; message: string }[]) => {
      for (const i of issues) err(i.path, i.message);
    };
    if (input.config) push(collectRuleIssues(input.config, ctx, 'config'));
    if (input.data) push(collectRuleIssues(input.data, ctx, 'data'));
    const steps = asArray<Step>(input.steps);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const label = (s as { name?: string })?.name;
      const base = `steps[${i}]${label ? ` "${label}"` : ''}`;
      push(collectRuleIssues((s as { data?: unknown }).data, ctx, `${base}.data`));
      push(collectRuleIssues((s as { trigger?: unknown }).trigger, ctx, `${base}.trigger`));
    }
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
  ctx: ValidateContext | undefined,
  err: (path: string, message: string) => void,
): void {
  const eventId = data?.eventId;
  if (!eventId) {
    err('eventId', 'Tracker has no event to fire.');
  } else {
    // A tracker may only fire a CUSTOM event — built-in (predefined) events are
    // excluded in the builder (it filters `!e.predefined`), so the API must reject
    // them too rather than publish a tracker that can never fire a trackable event.
    const event = ctx?.events?.find((e) => e.id === eventId);
    if (event?.predefined) {
      err(
        'eventId',
        `A tracker can only fire a custom event — "${event.codeName}" is a built-in system event. Create a custom event with create_event_definition and point the tracker at that.`,
      );
    }
  }
  if (asArray<RulesCondition>(config?.autoStartRules).length === 0) {
    err('autoStartRules', 'Tracker has no trigger conditions.');
  }
}
