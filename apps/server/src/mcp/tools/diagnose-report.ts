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
  id: string; // published | identified | start_rules | frequency | single_session | hidden | active_session | target
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
  /** Extra human-readable context for this leaf (e.g. why an unmatched attribute
   * can never match yet). */
  note?: string;
  /** Segment leaves only: how the segment defines membership. */
  segmentKind?: 'all' | 'manual' | 'condition';
  /** Segment leaves, kind=condition: the segment's OWN conditions annotated the
   * same way as the outer tree (status + actual values) — the per-condition
   * "why is this user outside" that the leaf verdict alone cannot give.
   * Explanatory: the authoritative in/out verdict is this leaf's own `status`. */
  segmentConditions?: AnnotatedCondition;
  /** Segment leaves, kind=manual: list size + whether THIS user/company is on it. */
  memberCount?: number;
  isMember?: boolean;
};

/** Collect the segment + content-state ids referenced anywhere in a condition tree, so the
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
    const ref = n as { type: string; segment?: string; content?: string };
    if (ref.type === 'segment' && ref.segment) segmentIds.add(ref.segment);
    if (ref.type === 'content_state' && ref.content) flowIds.add(ref.content);
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
  const ref = node as { type: string; segment?: string; content?: string };
  const id =
    ref.type === 'segment' ? ref.segment : ref.type === 'content_state' ? ref.content : undefined;
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
    const value = userAttributes[ref.attribute];
    node.actual = value ?? null;
    if (value === undefined && node.status === 'unmatched') {
      // The condition didn't fail on a wrong VALUE — the user has no value at
      // all. Event-derived attributes (event_attribute rules, custom
      // event-written fields) don't exist before their first event lands, so a
      // rule on one cannot match on the user's earliest evaluations — say so
      // instead of letting the agent chase targeting logic.
      node.note = `the user has NO value for "${ref.attribute}" yet — a rule on it cannot match until something writes it (event-derived attributes only exist after their first event lands)`;
    }
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
  hasCompany: boolean,
): ConditionStatus => {
  if (LIVE_ONLY.has(stamped.type)) return 'unknown';
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
    return { ...(r as object), status: leafStatus(s, r, hasCompany) } as AnnotatedCondition;
  };

  // The top-level list is itself an AND/OR group (the join is on the first item).
  // Mirror the runtime: only an explicit 'and' is ALL — missing evaluates as OR.
  return {
    type: 'group',
    match: stamped[0]?.operators === 'and' ? 'all' : 'any',
    status: isConditionsActived(stamped) ? 'matched' : 'unmatched',
    conditions: stamped.map((s, i) => node(s, readable[i])),
  } as AnnotatedCondition;
};

/**
 * Annotate a condition tree from PER-LEAF verdicts (`actived` true/false, unset
 * = not evaluable) — used for segment expansions, where verdicts come from the
 * runtime's own filter builder run one leaf at a time. Groups fold three-valued:
 * a group is matched/unmatched only when the leaves force it; an unknown leaf
 * that could still flip the outcome keeps the group `unknown`.
 */
export const annotateFromVerdicts = (
  stamped: RulesCondition[],
  readable: RepresentationCondition[],
): AnnotatedCondition | undefined => {
  if (!stamped || stamped.length === 0) return undefined;
  const leafStatusOf = (s: RulesCondition): ConditionStatus =>
    s.actived === true ? 'matched' : s.actived === false ? 'unmatched' : 'unknown';
  const fold = (children: ConditionStatus[], all: boolean): ConditionStatus => {
    if (all) {
      if (children.some((c) => c === 'unmatched')) return 'unmatched';
      return children.every((c) => c === 'matched') ? 'matched' : 'unknown';
    }
    if (children.some((c) => c === 'matched')) return 'matched';
    return children.every((c) => c === 'unmatched') ? 'unmatched' : 'unknown';
  };
  const node = (s: RulesCondition, r: RepresentationCondition): AnnotatedCondition => {
    if (s.conditions?.length) {
      const rChildren = (r as { conditions?: RepresentationCondition[] }).conditions ?? [];
      const kids = s.conditions.map((sc, i) => node(sc, rChildren[i]));
      return {
        ...(r as object),
        status: fold(
          kids.map((k) => k.status),
          (r as { match?: string }).match === 'all',
        ),
        conditions: kids,
      } as AnnotatedCondition;
    }
    return { ...(r as object), status: leafStatusOf(s) } as AnnotatedCondition;
  };
  const kids = stamped.map((s, i) => node(s, readable[i]));
  return {
    type: 'group',
    match: stamped[0]?.operators === 'and' ? 'all' : 'any',
    status: fold(
      kids.map((k) => k.status),
      stamped[0]?.operators === 'and',
    ),
    conditions: kids,
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
): { companyResolvable: boolean; liveOnly: boolean } => {
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
    if (type === 'attribute' && (scope === 'company' || scope === 'companyMembership'))
      companyResolvable = true;
    else liveOnly = true;
  };
  walk(node);
  return { companyResolvable, liveOnly };
};

/**
 * When a failed start_rules tree contains `unknown` leaves, the fail may be an
 * ARTIFACT: a not-evaluable condition (company-scoped without `companyId`, a
 * current_url without `url`) counts as not-matched in the server evaluation, so
 * the gate reads fail while the leaf reads unknown — two signals that look
 * contradictory (a real zero-knowledge-eval confusion). Name the way out.
 */
const startRulesUnknownCaveat = (tree?: AnnotatedCondition): string => {
  if (!tree) return '';
  const u = classifyUnknownLeaves(tree);
  if (!(u.companyResolvable || u.liveOnly)) return '';
  const fixes = [
    u.companyResolvable ? 'pass `companyId`' : '',
    u.liveOnly ? 'confirm live-only leaves in the app' : '',
  ]
    .filter(Boolean)
    .join(' / ');
  return ` NOTE: the tree contains \`unknown\` conditions the server could not evaluate — they count as NOT matched in this verdict, so the fail may be an artifact; ${fixes} for a clean verdict.`;
};

/**
 * Fold an annotated condition tree, deciding what an `unknown` leaf counts as.
 * The runtime's own fold treats unknown as NOT matched (it has no other option
 * server-side); running the same tree optimistically — unknown as matched —
 * separates two very different verdicts:
 *
 *   optimistic ALSO fails  → some leaf is definitively unmatched: a REAL block
 *   optimistic passes,
 *   pessimistic fails      → the difference is only the unknowns: UNDETERMINED
 *
 * Without this, a rule whose only leaf is live-only (every tracker, any flow
 * gated on a DOM element) reported "Blocked by: start_rules" while the tool's
 * own contract says `unknown` is not a blocker — the report contradicted
 * itself in one sentence, and sent authors to fix targeting that was fine.
 */
const foldAssumingUnknown = (
  node: AnnotatedCondition | undefined,
  assume: 'matched' | 'unmatched',
): boolean => {
  if (!node) return true;
  const children = (node as { conditions?: AnnotatedCondition[] }).conditions;
  if (children && children.length > 0) {
    const results = children.map((c) => foldAssumingUnknown(c, assume));
    return (node as { match?: string }).match === 'all'
      ? results.every(Boolean)
      : results.some(Boolean);
  }
  if (node.status === 'unknown') return assume === 'matched';
  return node.status === 'matched';
};

export const buildDiagnoseReport = (
  facts: DiagnoseFacts,
  startConditions?: AnnotatedCondition,
  hideConditions?: AnnotatedCondition,
  /** Render-anchor selectors the content draws against (launcher target, tooltip step targets).
   * The server can't verify the element exists, so they surface as an `unknown` gate — a typo'd
   * selector otherwise diagnoses fully green yet renders nothing. */
  renderTargets: string[] = [],
): DiagnoseReport => {
  const gates: Gate[] = [];

  const isAnnouncement = facts.contentType === ContentDataType.ANNOUNCEMENT;

  gates.push({
    id: 'published',
    status: facts.published ? 'pass' : 'fail',
    detail: facts.published
      ? 'published to this environment.'
      : 'NOT published to this environment.',
  });

  // Announcement-only structural gates — independent of the user, so they render
  // right after `published`: the scheduled-time hide and the resource-center
  // reachability requirement (the two "published but invisible" causes specific
  // to the feed).
  if (facts.published && isAnnouncement) {
    if (facts.scheduledAt) {
      gates.push({
        id: 'scheduled',
        status: facts.scheduledInFuture ? 'fail' : 'pass',
        detail: facts.scheduledInFuture
          ? `announcement time ${facts.scheduledAt} is in the FUTURE — the feed, badge, and popup all hide it until then (set scheduledAt earlier or clear it and republish).`
          : `announcement time ${facts.scheduledAt} has passed.`,
      });
    }
    gates.push({
      id: 'rc_reachability',
      status: facts.announcementBlockPublished ? 'pass' : 'fail',
      detail: facts.announcementBlockPublished
        ? 'a published resource center in this environment has an announcement block (the feed entry). Caveat: this checks the block EXISTS — a block hidden by its own onlyShowWhen conditions still counts, so specific users may still lack the entry.'
        : 'NO published resource center in this environment has an announcement block — announcements only reach users through one (feed, badge, and popup are all inside it). Add { "type": "announcement", "name": "What\'s new" } to a resource-center tab and publish it.',
    });
  }

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
        // The start_rules verdict is a CONFIGURATION fact and must not appear or
        // disappear based on the session state of whichever user you happened to
        // diagnose with: hiding it behind an active session made the same content
        // read healthy via one user and broken via another (the dead-checklist
        // audit case). Always emit it, truthfully. With an active session a fail
        // is INFORMATIONAL — the runtime resumes the session without
        // re-evaluating start rules — so it is excluded from blockedBy there.
        {
          // For an announcement the rules are a pure AUDIENCE filter (no rules =
          // visible to everyone), not an auto-start switch — word it as such.
          // For other types, "no rules at all" is usually a DESIGNED on-demand
          // guide (started via start_content / usertour.start()), not a broken
          // one — say so instead of a generic failure that reads like a bug.
          // A fail whose ONLY cause is not-evaluable leaves is not a fail — it is
          // "the server can't tell". Re-fold the tree optimistically to separate
          // the two, so `unknown` stops landing in `blockedBy` against the tool's
          // own contract (see foldAssumingUnknown).
          const undetermined =
            !facts.startRulesActive &&
            !!startConditions &&
            foldAssumingUnknown(startConditions, 'matched');
          const startRulesDetail = isAnnouncement
            ? facts.startRulesActive
              ? 'the audience filter matches this user (or there is no targeting).'
              : undetermined
                ? 'the audience filter cannot be decided server-side — every condition that fails here is one the server cannot evaluate; confirm it in the running app.'
                : 'the audience filter does not match this user — see startConditions.'
            : facts.startRulesActive
              ? 'auto-start enabled and start conditions match.'
              : undetermined
                ? `not decidable server-side: nothing here is definitively unmatched — the conditions that fail are the ones the server cannot evaluate (live-only DOM/text leaves, or company-scoped ones without \`companyId\`). This is NOT a block; confirm those leaves in the running app.${startRulesUnknownCaveat(startConditions)}`
                : startConditions
                  ? `auto-start disabled or a start condition does not match — see startConditions.${startRulesUnknownCaveat(startConditions)}`
                  : 'auto-start is not configured, so it never appears on its own — the normal ' +
                    'pattern for an on-demand guide launched via a checklist / resource-center ' +
                    '`start_content` reference or `usertour.start()`. Confirm something ' +
                    'references it; add startRules only if it should also start by itself.';
          gates.push({
            id: 'start_rules',
            status: facts.startRulesActive ? 'pass' : undetermined ? 'unknown' : 'fail',
            detail:
              facts.hasActiveSession && !facts.startRulesActive
                ? `informational, not a blocker here (this user is covered by the active session): ${startRulesDetail}`
                : startRulesDetail,
          });
        }
        // The remaining fresh-start gates (frequency / single_session) are
        // per-user STATE about whether a NEW session may start — meaningless
        // while one is already active (the runtime resumes it), so they stay
        // conditional; only the hide gate still applies to an active session.
        if (!facts.hasActiveSession) {
          // Only meaningful when the audience filter passes — for an excluded
          // user the feed omits the announcement entirely, so a "counts toward
          // the unread badge" line next to a failed start_rules gate would
          // contradict it (a real zero-knowledge-eval confusion).
          if (isAnnouncement && facts.announcementSeen !== undefined && facts.startRulesActive) {
            const popup = facts.announcementDistribution === 'popup';
            gates.push({
              id: 'seen',
              // Seen only BLOCKS the popup presentation (it never re-presents);
              // the feed keeps showing the item, just marked read.
              status: facts.announcementSeen && popup ? 'fail' : 'pass',
              detail: facts.announcementSeen
                ? popup
                  ? 'this user has already seen it — a popup presents only ONCE and never re-presents. It remains readable in the feed. To preview the popup again, use a fresh test user.'
                  : 'this user has already seen it — it stays in the feed (marked read) and no longer counts toward the unread badge.'
                : `not yet seen by this user — it counts toward the unread badge${popup ? ' and the popup will present if it is the newest unseen one.' : '.'}`,
            });
          }
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
            // "Lower the priority" is only actionable advice for types that HAVE
            // the priority knob — a banner does not (writing one is rejected), so
            // pointing there sends the author down a dead end.
            const remedy = caps.priority
              ? "Lower its priority or this one's, or stop the other."
              : `${facts.contentType} has no priority knob — unpublish the other, or narrow the two contents' start rules (URL patterns / time windows) so they don't overlap.`;
            gates.push({
              id: 'outranked',
              status: 'fail',
              detail: `another ${facts.contentType} (${winner}) wins the single ${facts.contentType} slot — only one ${facts.contentType} shows at a time. ${remedy}`,
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

  // Render anchors the server can't verify: a launcher/tooltip whose `target` selector is wrong
  // would pass every gate above and still render nothing — surface the selectors as `unknown`
  // (not a blocker) so the dependency is visible and the author re-checks them in the app.
  if (facts.published && renderTargets.length) {
    const list = [...new Set(renderTargets)].map((s) => `\`${s}\``).join(', ');
    gates.push({
      id: 'target',
      status: 'unknown',
      detail: `renders against target selector(s) ${list} — the server can't verify the element exists; confirm it's present on the page in the running app.`,
    });
  }

  const blockedBy = gates
    .filter((g) => g.status === 'fail')
    .map((g) => g.id)
    // A failing start_rules during an ACTIVE session is informational — the
    // content IS showing (resumed), nothing is blocked by it.
    .filter((id) => !(facts.hasActiveSession && id === 'start_rules'));
  // `unknown` conditions are NOT blockers (only `blockedBy` blocks). Classify them so the
  // summary names what resolves each, and never lets an agent read an `unknown` leaf as a
  // second blocker beside the real ones.
  const su = classifyUnknownLeaves(startConditions);
  const hu = classifyUnknownLeaves(hideConditions);
  const companyResolvable = su.companyResolvable || hu.companyResolvable;
  const liveOnly = su.liveOnly || hu.liveOnly;
  const anyUnknown = companyResolvable || liveOnly;
  const resolveUnknown = [
    companyResolvable ? 'pass `companyId` to resolve company-scoped conditions' : '',
    liveOnly ? 'confirm live-only conditions (DOM element / text) in the running app' : '',
  ]
    .filter(Boolean)
    .join('; ');
  const hasUnknown = (c: ReturnType<typeof classifyUnknownLeaves>) =>
    c.companyResolvable || c.liveOnly;
  const unknownWhere = [
    hasUnknown(su) ? 'startConditions' : '',
    hasUnknown(hu) ? 'hideConditions' : '',
  ]
    .filter(Boolean)
    .join('/');
  // When nothing blocks, "should show" still hinges on the render anchor existing — flag it so
  // the green summary isn't read as "definitely renders".
  const targetNote = renderTargets.length
    ? ' Also confirm the target selector(s) it anchors to exist on the page (see the `target` gate).'
    : '';

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
      : `Currently active for this user — it is showing (or resumes on the next load)${
          renderTargets.length
            ? ' — provided its target element exists on the page; the server cannot verify that (see the target gate)'
            : ''
        }.`;
  } else if (blockedBy.length) {
    summary = `Blocked by: ${blockedBy.join(', ')}.${
      anyUnknown
        ? ` (\`unknown\` conditions are NOT blockers — ${resolveUnknown}; see ${unknownWhere}.)`
        : ''
    }`;
  } else if (anyUnknown) {
    summary = `No server-side blocker, but some conditions can only be confirmed live — ${resolveUnknown} (see ${unknownWhere}).${targetNote}`;
  } else if (facts.contentType === ContentDataType.TRACKER) {
    // A tracker is headless — it has no UI to "show"; it fires its event when its start
    // conditions match. Keep the summary truthful for the type.
    summary =
      'No server-side blocker — it fires its event when its start conditions match on a matching page. Verify live that identify() fires for this user.';
  } else if (isAnnouncement) {
    // An announcement doesn't "show on a page" — it sits in the resource-center
    // feed and notifies per its distribution level.
    summary =
      'No server-side blocker — it is in the announcement feed for this user (badge / popup per its distribution) once they open a resource center with an announcement block.';
  } else {
    summary = `No server-side blocker — it should show on a matching page. Verify live that identify() fires for this user.${targetNote}`;
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
