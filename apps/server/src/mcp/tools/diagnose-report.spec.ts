import { ContentDataType, RulesCondition } from '@usertour/types';

import { decompileConditions } from '@/api/content-representation/rules.decompile';
import type { DiagnoseFacts } from '@/web-socket/core/content-diagnosis.service';

import {
  type AnnotatedCondition,
  annotateConditions,
  attachConditionNames,
  attachUserAttributeValues,
  buildDiagnoseReport,
  collectConditionRefs,
} from './diagnose-report';

// Identity resolvers: keep ids as codes (the test doesn't need real names).
const resolvers = { attributeCode: (id: string) => id, eventCode: (id: string) => id };

let n = 0;
const id = () => `r${n++}`;
const attr = (value: string, actived: boolean): RulesCondition => ({
  id: id(),
  type: 'user-attr',
  data: { attrId: 'plan', logic: 'is', value },
  operators: 'and',
  actived,
});
const element = (): RulesCondition => ({ id: id(), type: 'element', data: {}, operators: 'and' });
const seg = (actived: boolean): RulesCondition => ({
  id: id(),
  type: 'segment',
  data: { segmentId: 'seg-pro', logic: 'is' },
  operators: 'and',
  actived,
});
const flowState = (actived: boolean): RulesCondition => ({
  id: id(),
  type: 'content',
  data: { contentId: 'flow-welcome', logic: 'seen' },
  operators: 'and',
  actived,
});
const group = (children: RulesCondition[], childJoin: 'and' | 'or'): RulesCondition => ({
  id: id(),
  type: 'group',
  data: {},
  operators: 'and',
  conditions: children.map((c, i) => (i === 0 ? { ...c, operators: childJoin } : c)),
});

const facts = (over: Partial<DiagnoseFacts> = {}): DiagnoseFacts =>
  ({
    contentType: 'flow',
    publishedVersionId: 'v1',
    published: true,
    userId: 'u1',
    userFound: true,
    startRulesActive: true,
    frequencyAllowed: true,
    hidden: false,
    singleSessionApplicable: false,
    hasActiveSession: false,
    ...over,
  }) as DiagnoseFacts;

describe('annotateConditions (decompiled readable + runtime status, lockstep)', () => {
  it('mirrors a nested (OR) AND rule and marks each node from the runtime stamp', () => {
    // (plan is enterprise OR plan is pro) AND <element on page>, user on free.
    const stamped: RulesCondition[] = [
      { ...group([attr('enterprise', false), attr('pro', false)], 'or'), operators: 'and' },
      element(),
    ];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), false);
    expect(tree?.status).toBe('unmatched');
    const orGroup = tree?.conditions?.[0];
    expect(orGroup?.status).toBe('unmatched');
    expect(orGroup?.conditions?.map((c) => c.status)).toEqual(['unmatched', 'unmatched']);
    // readable form came from decompile (attribute condition), not a bespoke label.
    expect(orGroup?.conditions?.[0].type).toBe('attribute');
    // element is live-only → unknown.
    expect(tree?.conditions?.[1].status).toBe('unknown');
    expect(tree?.conditions?.[1].type).toBe('element');
  });

  it('nested OR partial match: pinpoints the satisfied branch vs the failing sibling', () => {
    // (plan is enterprise OR plan is pro) AND in-segment ; user is pro but NOT in segment.
    const stamped: RulesCondition[] = [
      { ...group([attr('enterprise', false), attr('pro', true)], 'or'), operators: 'and' },
      seg(false),
    ];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), false);
    expect(tree?.status).toBe('unmatched'); // top AND fails
    const orGroup = tree?.conditions?.[0];
    expect(orGroup?.status).toBe('matched'); // OR satisfied by the pro branch
    expect(orGroup?.conditions?.map((c) => c.status)).toEqual(['unmatched', 'matched']);
    const segNode = tree?.conditions?.[1];
    expect(segNode?.type).toBe('segment'); // decompiled shape, not a bespoke label
    expect(segNode?.status).toBe('unmatched'); // the real blocker
  });

  it('collects + attaches segment/content names (ids → names) across a nested tree', () => {
    const stamped: RulesCondition[] = [
      { ...group([seg(false), flowState(true)], 'and'), operators: 'and' },
    ];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), false);
    const refs = collectConditionRefs(tree);
    expect(refs.segmentIds).toEqual(['seg-pro']);
    expect(refs.flowIds).toEqual(['flow-welcome']);
    attachConditionNames(tree, { 'seg-pro': 'Pro Users', 'flow-welcome': 'Welcome Tour' });
    const inner = tree?.conditions?.[0].conditions as
      | Array<{ type: string; name?: string }>
      | undefined;
    expect(inner?.find((c) => c.type === 'segment')?.name).toBe('Pro Users');
    expect(inner?.find((c) => c.type === 'flow')?.name).toBe('Welcome Tour');
  });

  it('attaches the user ACTUAL value to user-scoped attribute leaves (present → value, absent → null)', () => {
    const tree = {
      type: 'group',
      match: 'all',
      status: 'unmatched',
      conditions: [
        {
          type: 'attribute',
          scope: 'user',
          attribute: 'first_seen_at',
          op: 'more_than',
          value: '2',
          status: 'unmatched',
        },
        {
          type: 'attribute',
          scope: 'user',
          attribute: 'missing_attr',
          op: 'is',
          status: 'unmatched',
        },
        {
          type: 'attribute',
          scope: 'company',
          attribute: 'plan_tier',
          op: 'is',
          status: 'matched',
        },
        { type: 'segment', segment: 'seg-pro', in: true, status: 'unmatched' },
      ],
    } as unknown as AnnotatedCondition;
    attachUserAttributeValues(tree, { first_seen_at: '2026-06-26T13:22:12.365Z', plan: 'pro' });
    const c = tree.conditions as Array<{ actual?: unknown }>;
    expect(c[0].actual).toBe('2026-06-26T13:22:12.365Z'); // user scope, present → value
    expect(c[1].actual).toBeNull(); // user scope, absent → null (attribute not set)
    expect(c[2].actual).toBeUndefined(); // company scope → untouched (not user data)
    expect(c[3].actual).toBeUndefined(); // segment → untouched
  });

  it('content (flow-state) condition uses the runtime .actived, not live-only unknown', () => {
    // Regression guard: segment/content are server-stamped — they must NOT be in LIVE_ONLY.
    const stamped: RulesCondition[] = [flowState(true)];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), false);
    expect(tree?.conditions?.[0].type).toBe('flow');
    expect(tree?.conditions?.[0].status).toBe('matched');
  });
});

describe('buildDiagnoseReport (gate checklist + summary)', () => {
  it('start_rules blocked: names the gate and carries the annotated tree', () => {
    const stamped: RulesCondition[] = [attr('enterprise', false)];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), true);
    const r = buildDiagnoseReport(
      facts({ startRulesActive: false, autoStartRules: stamped }),
      tree,
    );
    expect(r.blockedBy).toContain('start_rules');
    expect(r.startConditions?.conditions?.[0].status).toBe('unmatched');
  });

  it('per-type gates: banner omits frequency + hidden, keeps single_session', () => {
    const r = buildDiagnoseReport(
      facts({
        contentType: ContentDataType.BANNER,
        singleSessionApplicable: true,
        singleSessionDismissed: false,
      }),
    );
    const ids = r.gates.map((g) => g.id);
    expect(ids).not.toContain('frequency');
    expect(ids).not.toContain('hidden');
    expect(ids).toContain('single_session');
    expect(ids).toContain('start_rules');
  });

  it('per-type gates: resource-center keeps hidden, omits frequency', () => {
    const ids = buildDiagnoseReport(
      facts({ contentType: ContentDataType.RESOURCE_CENTER, singleSessionApplicable: true }),
    ).gates.map((g) => g.id);
    expect(ids).toContain('hidden');
    expect(ids).not.toContain('frequency');
  });

  it('active session: NOT blocked by fresh-start gates (it is showing/resumes)', () => {
    // The runtime resumes an active session; the auto-start gates (start_rules /
    // frequency / single_session) describe a FRESH start and are moot here — so they
    // must not appear in blockedBy, which would contradict "currently active".
    const r = buildDiagnoseReport(
      facts({ hasActiveSession: true, startRulesActive: false, frequencyAllowed: false }),
    );
    expect(r.summary).toMatch(/currently active/i);
    expect(r.blockedBy).not.toContain('start_rules');
    expect(r.blockedBy).not.toContain('frequency');
  });

  it('active session + hide active: hide will cancel it → blocked by hidden', () => {
    const r = buildDiagnoseReport(facts({ hasActiveSession: true, hidden: true }));
    expect(r.blockedBy).toEqual(['hidden']);
  });

  it('outranked: a higher-priority sibling wins the slot → blocked even though own gates pass', () => {
    const r = buildDiagnoseReport(facts({ outrankedByContentId: 'c_winner' }));
    expect(r.gates.find((g) => g.id === 'start_rules')?.status).toBe('pass');
    expect(r.blockedBy).toContain('outranked');
    expect(r.gates.find((g) => g.id === 'outranked')?.detail).toContain('c_winner');
  });

  it('active slot held by another content → blocked, even though its own gates pass', () => {
    const r = buildDiagnoseReport(
      facts({ activeSlotHeldByContentId: 'c_holder', activeSlotHeldByName: 'Welcome Tour' }),
    );
    expect(r.gates.find((g) => g.id === 'start_rules')?.status).toBe('pass');
    expect(r.blockedBy).toContain('active_slot');
    expect(r.gates.find((g) => g.id === 'active_slot')?.detail).toContain('Welcome Tour');
  });

  it('unknown leaves are flagged NOT blockers, with how to resolve each (url vs live-only)', () => {
    // Real blocker (frequency) PLUS a current_url leaf that is unknown because no url was
    // passed. The summary must not let the unknown read as a second blocker, and must say
    // `url` resolves it — the gap the diagnose eval flagged (unknown easily misread as fail).
    const stamped: RulesCondition[] = [
      { id: id(), type: 'current-page', data: { includes: ['*/'] }, operators: 'and' },
    ];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), false);
    expect(tree?.conditions?.[0].status).toBe('unknown'); // current_url, no url → unknown
    const r = buildDiagnoseReport(facts({ frequencyAllowed: false }), tree);
    expect(r.blockedBy).toEqual(['frequency']); // the unknown leaf is NOT in blockedBy
    expect(r.summary).toMatch(/not blockers/i);
    expect(r.summary).toContain('pass `url`');
    expect(r.summary).toContain('startConditions');
  });

  it('a live-only DOM unknown leaf points to the app, not to `url`', () => {
    const stamped: RulesCondition[] = [element()];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), false);
    const r = buildDiagnoseReport(facts(), tree); // no server-side blocker
    expect(r.blockedBy).toEqual([]);
    expect(r.summary).toMatch(/confirmed live/i);
    expect(r.summary).toContain('running app');
    expect(r.summary).not.toContain('pass `url`');
  });

  it('not published / no user / active session summaries', () => {
    expect(buildDiagnoseReport(facts({ published: false })).blockedBy).toEqual(['published']);
    expect(buildDiagnoseReport(facts({ userId: undefined })).summary).toMatch(/pass a userId/i);
    expect(buildDiagnoseReport(facts({ userFound: false })).blockedBy).toEqual(['identified']);
    expect(buildDiagnoseReport(facts({ hasActiveSession: true })).summary).toMatch(
      /currently active/i,
    );
  });
});
