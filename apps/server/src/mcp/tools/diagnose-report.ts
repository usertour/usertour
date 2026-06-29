import { getAutoStartCapabilities, isConditionsActived } from '@usertour/helpers';
import { ContentDataType, RulesCondition, RulesType } from '@usertour/types';

import type { RepresentationCondition } from '@/api/content-representation/representation.schema';
import type { DiagnoseFacts } from '@/web-socket/core/content-diagnosis.service';

/**
 * MCP-layer assembler for "why isn't my content showing?". The websocket service
 * produced the gate facts + STAMPED compiled rules; the readable condition shapes
 * come from `decompileConditions` (api layer) in the handler. Here we only:
 *   - overlay each condition's status (leaf = the runtime's `.actived`; group = the
 *     runtime's `isConditionsActived` fold; live-only leaves = `unknown`), and
 *   - assemble the gate checklist + a one-line summary.
 * No re-derivation of the orchestrator's composition; no bespoke condition labels.
 */

export type GateStatus = 'pass' | 'fail' | 'unknown';
/** A condition states a FACT ("satisfied?"); a gate is a JUDGMENT ("blocks?"). Kept
 * distinct so a hide condition being `matched` (it would hide) reads correctly. */
export type ConditionStatus = 'matched' | 'unmatched' | 'unknown';

export interface Gate {
  id: string; // published | identified | start_rules | frequency | single_session | hidden | active_session
  status: GateStatus;
  detail: string;
}

/** A decompiled readable condition (representation shape) annotated with status. */
export type AnnotatedCondition = RepresentationCondition & {
  status: ConditionStatus;
  conditions?: AnnotatedCondition[];
  /** Human name for `segment`/`flow` nodes (their `segment`/`flow` fields are ids per the
   * representation contract); filled in the MCP layer so the cause reads without a lookup. */
  name?: string;
  /** The user's ACTUAL current value for a user-scoped `attribute` leaf (null = not set),
   * so an unmatched condition explains itself without a separate get_user + date math. */
  actual?: unknown;
};

/** Collect the segment + content(flow) ids referenced anywhere in a condition tree, so the
 * MCP layer can batch-resolve their names (the representation keeps them as ids). */
export const collectConditionRefs = (
  node?: AnnotatedCondition,
): { segmentIds: string[]; flowIds: string[] } => {
  const segmentIds = new Set<string>();
  const flowIds = new Set<string>();
  const walk = (n?: AnnotatedCondition) => {
    if (!n) return;
    if (n.conditions) {
      for (const c of n.conditions) walk(c);
      return;
    }
    const ref = n as { type: string; segment?: string; flow?: string };
    if (ref.type === 'segment' && ref.segment) segmentIds.add(ref.segment);
    if (ref.type === 'flow' && ref.flow) flowIds.add(ref.flow);
  };
  walk(node);
  return { segmentIds: [...segmentIds], flowIds: [...flowIds] };
};

/** Attach resolved names to `segment`/`flow` leaves in place (id → name map). */
export const attachConditionNames = (
  node: AnnotatedCondition | undefined,
  nameById: Record<string, string>,
): void => {
  if (!node) return;
  if (node.conditions) {
    for (const c of node.conditions) attachConditionNames(c, nameById);
    return;
  }
  const ref = node as { type: string; segment?: string; flow?: string };
  const id = ref.type === 'segment' ? ref.segment : ref.type === 'flow' ? ref.flow : undefined;
  if (id && nameById[id]) node.name = nameById[id];
};

/** Attach the user's ACTUAL value to each user-scoped `attribute` leaf in place (codeName →
 * value; null when the user has no value), so an unmatched leaf explains itself. */
export const attachUserAttributeValues = (
  node: AnnotatedCondition | undefined,
  userAttributes: Record<string, unknown>,
): void => {
  if (!node) return;
  if (node.conditions) {
    for (const c of node.conditions) attachUserAttributeValues(c, userAttributes);
    return;
  }
  const ref = node as { type: string; scope?: string; attribute?: string };
  if (ref.type === 'attribute' && ref.scope === 'user' && ref.attribute) {
    node.actual = userAttributes[ref.attribute] ?? null;
  }
};

export interface DiagnoseReport {
  contentType: string;
  summary: string;
  blockedBy: string[];
  gates: Gate[];
  startConditions?: AnnotatedCondition;
  hideConditions?: AnnotatedCondition;
}

const LIVE_ONLY = new Set<string>([
  RulesType.ELEMENT,
  RulesType.TEXT_INPUT,
  RulesType.TEXT_FILL,
  RulesType.TASK_IS_CLICKED,
  RulesType.WAIT,
]);

const leafStatus = (
  stamped: RulesCondition,
  readable: RepresentationCondition,
  hasUrl: boolean,
  hasCompany: boolean,
): ConditionStatus => {
  if (LIVE_ONLY.has(stamped.type)) return 'unknown';
  if (stamped.type === RulesType.CURRENT_PAGE && !hasUrl) return 'unknown';
  // A company / companyMembership attribute condition can't be evaluated without a company
  // context (the diagnose `companyId`). Report unknown — NOT a definitive `unmatched` that
  // would read as "the user's company doesn't qualify" — so the agent passes companyId
  // instead of chasing the wrong cause. Mirrors current_url → unknown when no `url`.
  const scope = (readable as { scope?: string }).scope;
  if (!hasCompany && (scope === 'company' || scope === 'companyMembership')) return 'unknown';
  return stamped.actived ? 'matched' : 'unmatched';
};

/**
 * Overlay runtime status onto the decompiled readable conditions. `stamped` (compiled,
 * with `.actived`) and `readable` (from decompileConditions) are structurally 1:1
 * (decompileConditions maps each condition without reshaping the tree).
 */
export const annotateConditions = (
  stamped: RulesCondition[],
  readable: RepresentationCondition[],
  hasUrl: boolean,
  hasCompany = false,
): AnnotatedCondition | undefined => {
  if (!stamped || stamped.length === 0) return undefined;

  const node = (s: RulesCondition, r: RepresentationCondition): AnnotatedCondition => {
    if (s.type === RulesType.GROUP && s.conditions) {
      const rChildren = (r as { conditions?: RepresentationCondition[] }).conditions ?? [];
      return {
        ...(r as object),
        status: isConditionsActived(s.conditions) ? 'matched' : 'unmatched',
        conditions: s.conditions.map((sc, i) => node(sc, rChildren[i])),
      } as AnnotatedCondition;
    }
    return { ...(r as object), status: leafStatus(s, r, hasUrl, hasCompany) } as AnnotatedCondition;
  };

  // The top-level list is itself an AND/OR group (the join is on the first item).
  return {
    type: 'group',
    match: stamped[0]?.operators === 'or' ? 'any' : 'all',
    status: isConditionsActived(stamped) ? 'matched' : 'unmatched',
    conditions: stamped.map((s, i) => node(s, readable[i])),
  } as AnnotatedCondition;
};

/**
 * Categorize the `unknown` (not-server-evaluable) leaves so the summary can say what to DO
 * about each — and make explicit they are NOT blockers (an agent must not read an `unknown`
 * leaf as a second blocker alongside the real ones in `blockedBy`). `current_url` unknowns
 * resolve by passing `url`; company / companyMembership ones by passing `companyId`; the rest
 * (DOM element / text, wait) are live-only and need the app.
 */
const classifyUnknownLeaves = (
  node?: AnnotatedCondition,
): { urlResolvable: boolean; companyResolvable: boolean; liveOnly: boolean } => {
  let urlResolvable = false;
  let companyResolvable = false;
  let liveOnly = false;
  const walk = (n?: AnnotatedCondition) => {
    if (!n) return;
    if (n.conditions) {
      for (const c of n.conditions) walk(c);
      return;
    }
    if (n.status !== 'unknown') return;
    const type = (n as { type?: string }).type;
    const scope = (n as { scope?: string }).scope;
    if (type === 'current_url') urlResolvable = true;
    else if (type === 'attribute' && (scope === 'company' || scope === 'companyMembership'))
      companyResolvable = true;
    else liveOnly = true;
  };
  walk(node);
  return { urlResolvable, companyResolvable, liveOnly };
};

export const buildDiagnoseReport = (
  facts: DiagnoseFacts,
  startConditions?: AnnotatedCondition,
  hideConditions?: AnnotatedCondition,
): DiagnoseReport => {
  const gates: Gate[] = [];

  gates.push({
    id: 'published',
    status: facts.published ? 'pass' : 'fail',
    detail: facts.published
      ? 'published to this environment.'
      : 'NOT published to this environment.',
  });

  if (facts.published) {
    if (facts.userId === undefined) {
      gates.push({
        id: 'identified',
        status: 'unknown',
        detail: 'no userId supplied — pass one to evaluate the per-user gates.',
      });
    } else {
      gates.push({
        id: 'identified',
        status: facts.userFound ? 'pass' : 'fail',
        detail: facts.userFound
          ? 'a user with this externalId exists (identify has fired at least once).'
          : 'no user with this externalId — the app must call usertour.identify() with the SAME id the content targets (the #1 cause).',
      });

      if (facts.userFound) {
        // Only emit the gates this content type actually supports (AUTO_START_CAPABILITIES):
        // e.g. banner/launcher have no frequency or hide rules, resource-center has no
        // frequency. Showing an inapplicable gate would be noise/misleading.
        const caps = getAutoStartCapabilities(facts.contentType);
        // The fresh-start gates (start_rules / frequency / single_session) decide
        // whether the runtime would AUTO-START a NEW session. When one is already
        // active, the runtime resumes it instead of re-evaluating these — so emitting
        // them would contradict "currently active" (see active_session). Only the hide
        // gate still applies to an active session (a hide rule can cancel it).
        if (!facts.hasActiveSession) {
          gates.push({
            id: 'start_rules',
            status: facts.startRulesActive ? 'pass' : 'fail',
            detail: facts.startRulesActive
              ? 'auto-start enabled and start conditions match.'
              : 'auto-start disabled / no rules / a start condition does not match — see startConditions.',
          });
          if (caps.frequency) {
            gates.push({
              id: 'frequency',
              status: facts.frequencyAllowed ? 'pass' : 'fail',
              detail: facts.frequencyAllowed
                ? 'frequency / start-if-not-complete allows it now.'
                : 'frequency cap reached, or start-if-not-complete and already completed.',
            });
          }
          if (facts.singleSessionApplicable) {
            gates.push({
              id: 'single_session',
              status: facts.singleSessionDismissed ? 'fail' : 'pass',
              detail: facts.singleSessionDismissed
                ? `a ${facts.contentType} shows once per user and a prior session was already dismissed/ended.`
                : 'shows once per user; not yet shown (or still active).',
            });
          }
          // Singleton types fill ONE slot. (a) Another content of this type currently has
          // a live session → the runtime resumes it before anything fresh starts, so this
          // one can't appear regardless of priority.
          if (facts.activeSlotHeldByContentId) {
            const holder = facts.activeSlotHeldByName
              ? `'${facts.activeSlotHeldByName}'`
              : `content '${facts.activeSlotHeldByContentId}'`;
            gates.push({
              id: 'active_slot',
              status: 'fail',
              detail: `another ${facts.contentType} (${holder}) has an active session; the runtime resumes it into the single ${facts.contentType} slot before starting anything new, so this one won't appear until that session ends.`,
            });
          }
          // (b) No resume in the way, but this one is eligible yet outranked by a
          // higher-priority sibling — it passes all its own gates yet never shows.
          if (facts.outrankedByContentId) {
            const winner = facts.outrankedByName
              ? `'${facts.outrankedByName}'`
              : `content '${facts.outrankedByContentId}'`;
            gates.push({
              id: 'outranked',
              status: 'fail',
              detail: `another ${facts.contentType} (${winner}) has higher priority and wins the single slot — only one ${facts.contentType} shows at a time. Lower its priority or this one's, or stop the other.`,
            });
          }
        }
        if (caps.hideRules) {
          gates.push({
            id: 'hidden',
            status: facts.hidden ? 'fail' : 'pass',
            detail: facts.hidden
              ? 'a hide rule is active for this user — see hideConditions.'
              : 'no hide rule is active.',
          });
        }
        if (facts.hasActiveSession) {
          gates.push({
            id: 'active_session',
            status: 'pass',
            detail: 'currently has an active session — it is showing / will resume.',
          });
        }
      }
    }
  }

  const blockedBy = gates.filter((g) => g.status === 'fail').map((g) => g.id);
  // `unknown` conditions are NOT blockers (only `blockedBy` blocks). Classify them so the
  // summary names what resolves each, and never lets an agent read an `unknown` leaf as a
  // second blocker beside the real ones.
  const su = classifyUnknownLeaves(startConditions);
  const hu = classifyUnknownLeaves(hideConditions);
  const urlResolvable = su.urlResolvable || hu.urlResolvable;
  const companyResolvable = su.companyResolvable || hu.companyResolvable;
  const liveOnly = su.liveOnly || hu.liveOnly;
  const anyUnknown = urlResolvable || companyResolvable || liveOnly;
  const resolveUnknown = [
    urlResolvable ? 'pass `url` to resolve current_url conditions' : '',
    companyResolvable ? 'pass `companyId` to resolve company-scoped conditions' : '',
    liveOnly ? 'confirm live-only conditions (DOM element / text) in the running app' : '',
  ]
    .filter(Boolean)
    .join('; ');
  const hasUnknown = (c: ReturnType<typeof classifyUnknownLeaves>) =>
    c.urlResolvable || c.companyResolvable || c.liveOnly;
  const unknownWhere = [
    hasUnknown(su) ? 'startConditions' : '',
    hasUnknown(hu) ? 'hideConditions' : '',
  ]
    .filter(Boolean)
    .join('/');

  let summary: string;
  if (!facts.published) {
    summary = 'Not published to this environment — publish it first.';
  } else if (facts.userId === undefined) {
    summary =
      'Published. Pass a userId to evaluate the per-user gates (conditions, frequency, session).';
  } else if (!facts.userFound) {
    summary =
      'User not identified — the app must call usertour.identify() with the id the content targets (the #1 cause).';
  } else if (facts.hasActiveSession) {
    summary = facts.hidden
      ? 'Has an active session, but a hide rule is active — the runtime will cancel it (won’t show).'
      : 'Currently active for this user — it is showing (or resumes on the next load).';
  } else if (blockedBy.length) {
    summary = `Blocked by: ${blockedBy.join(', ')}.${
      anyUnknown
        ? ` (\`unknown\` conditions are NOT blockers — ${resolveUnknown}; see ${unknownWhere}.)`
        : ''
    }`;
  } else if (anyUnknown) {
    summary = `No server-side blocker, but some conditions can only be confirmed live — ${resolveUnknown} (see ${unknownWhere}).`;
  } else if (facts.contentType === ContentDataType.TRACKER) {
    // A tracker is headless — it has no UI to "show"; it fires its event when its start
    // conditions match. Keep the summary truthful for the type.
    summary =
      'No server-side blocker — it fires its event when its start conditions match on a matching page. Verify live that identify() fires for this user.';
  } else {
    summary =
      'No server-side blocker — it should show on a matching page. Verify live that identify() fires for this user.';
  }

  return {
    contentType: facts.contentType,
    summary,
    blockedBy,
    gates,
    startConditions,
    hideConditions,
  };
};
