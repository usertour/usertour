import { getAutoStartCapabilities, isConditionsActived } from '@usertour/helpers';
import { RulesCondition, RulesType } from '@usertour/types';

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

const leafStatus = (stamped: RulesCondition, hasUrl: boolean): ConditionStatus => {
  if (LIVE_ONLY.has(stamped.type)) return 'unknown';
  if (stamped.type === RulesType.CURRENT_PAGE && !hasUrl) return 'unknown';
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
    return { ...(r as object), status: leafStatus(s, hasUrl) } as AnnotatedCondition;
  };

  // The top-level list is itself an AND/OR group (the join is on the first item).
  return {
    type: 'group',
    match: stamped[0]?.operators === 'or' ? 'any' : 'all',
    status: isConditionsActived(stamped) ? 'matched' : 'unmatched',
    conditions: stamped.map((s, i) => node(s, readable[i])),
  } as AnnotatedCondition;
};

const hasUnknownLeaf = (node?: AnnotatedCondition): boolean => {
  if (!node) return false;
  if (node.conditions) return node.conditions.some(hasUnknownLeaf);
  return node.status === 'unknown';
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
  const liveOnly = hasUnknownLeaf(startConditions);

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
    summary = 'Currently active for this user — it is showing (or resumes on the next load).';
  } else if (blockedBy.length) {
    summary = `Blocked by: ${blockedBy.join(', ')}.${
      blockedBy.includes('start_rules') && liveOnly
        ? ' Some start conditions are live-only (see startConditions) — confirm in the app.'
        : ''
    }`;
  } else if (liveOnly) {
    summary =
      'No server-side blocker, but it depends on live conditions (see startConditions) — verify in the app.';
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
