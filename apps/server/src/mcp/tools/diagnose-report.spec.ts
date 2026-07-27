import { ContentDataType, RulesCondition, RulesType } from '@usertour/types';

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
    expect(inner?.find((c) => c.type === 'content_state')?.name).toBe('Welcome Tour');
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
    // An unmatched leaf whose attribute has NO value at all carries a note —
    // it did not fail on a wrong value, it cannot match until something writes
    // the attribute (agents chased targeting logic here; console sweep C-item).
    const notes = tree.conditions as Array<{ note?: string }>;
    expect(notes[1].note).toContain('NO value');
    expect(notes[1].note).toContain('missing_attr');
    expect(notes[0].note).toBeUndefined(); // present value, no note
  });

  it('content (flow-state) condition uses the runtime .actived, not live-only unknown', () => {
    // Regression guard: segment/content are server-stamped — they must NOT be in LIVE_ONLY.
    const stamped: RulesCondition[] = [flowState(true)];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), false);
    expect(tree?.conditions?.[0].type).toBe('content_state');
    expect(tree?.conditions?.[0].status).toBe('matched');
  });

  it('company-scoped condition: unknown without a company context, evaluated with one', () => {
    // A company / companyMembership condition can't be judged without a companyId, so it must
    // read `unknown` (not a definitive `unmatched` that looks like "the company doesn't qualify").
    const stamped: RulesCondition[] = [attr('enterprise', false)];
    const readable = [
      {
        type: 'attribute',
        scope: 'company',
        attribute: 'plan_tier',
        op: 'is',
        value: 'enterprise',
      },
    ] as any;
    expect(annotateConditions(stamped, readable, false)?.conditions?.[0].status).toBe('unknown');
    // With a company context it is evaluated against the runtime stamp (actived false → unmatched).
    expect(annotateConditions(stamped, readable, true)?.conditions?.[0].status).toBe('unmatched');
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

  it('start_rules stays on the checklist even with an active session (config fact, informational)', () => {
    // The dead-checklist audit case: no auto-start configured, but the asked-about
    // user happens to have an active session. The gate list must still carry the
    // configuration truth — while NOT counting it as a blocker (it is showing).
    const r = buildDiagnoseReport(facts({ hasActiveSession: true, startRulesActive: false }));
    const gate = r.gates.find((g) => g.id === 'start_rules');
    expect(gate?.status).toBe('fail');
    expect(gate?.detail).toContain('informational');
    expect(gate?.detail).toContain('never appears on its own');
    expect(r.blockedBy).not.toContain('start_rules');
    expect(r.summary).toMatch(/currently active/i);
  });

  it('active-session summary hedges when a render target cannot be verified', () => {
    const r = buildDiagnoseReport(
      facts({ hasActiveSession: true, startRulesActive: true }),
      undefined,
      undefined,
      ['a[href="/tasks"]'],
    );
    expect(r.summary).toContain('provided its target element exists');
  });

  it('active slot held by another content → blocked, even though its own gates pass', () => {
    const r = buildDiagnoseReport(
      facts({ activeSlotHeldByContentId: 'c_holder', activeSlotHeldByName: 'Welcome Tour' }),
    );
    expect(r.gates.find((g) => g.id === 'start_rules')?.status).toBe('pass');
    expect(r.blockedBy).toContain('active_slot');
    expect(r.gates.find((g) => g.id === 'active_slot')?.detail).toContain('Welcome Tour');
  });

  it('unknown leaves are flagged NOT blockers, with how to resolve each (live-only)', () => {
    // Real blocker (frequency) PLUS an element leaf that is unknown because it can only be
    // observed in the running app. The summary must not let the unknown read as a second
    // blocker, and must say how to resolve it. (current_url no longer produces unknowns:
    // `url` is required at the tool boundary, so it is always evaluated.)
    const stamped: RulesCondition[] = [
      {
        id: id(),
        type: 'element',
        data: { elementData: { customSelector: '.cta' }, logic: 'present' },
        operators: 'and',
      },
    ];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), false);
    expect(tree?.conditions?.[0].status).toBe('unknown'); // live-only: DOM state
    const r = buildDiagnoseReport(facts({ frequencyAllowed: false }), tree);
    expect(r.blockedBy).toEqual(['frequency']); // the unknown leaf is NOT in blockedBy
    expect(r.summary).toMatch(/not blockers/i);
    expect(r.summary).toContain('live-only');
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

  it('company condition unknown → summary points to companyId (not a real blocker)', () => {
    // Diagnosing a company-gated flow without companyId: the gate fails (runtime can't match),
    // but the summary must flag the company condition as unknown and say to pass companyId —
    // not let the agent conclude the user's company doesn't qualify.
    const stamped: RulesCondition[] = [attr('enterprise', false)];
    const readable = [
      {
        type: 'attribute',
        scope: 'company',
        attribute: 'plan_tier',
        op: 'is',
        value: 'enterprise',
      },
    ] as any;
    const tree = annotateConditions(stamped, readable, false); // company unknown
    const r = buildDiagnoseReport(
      facts({ startRulesActive: false, autoStartRules: stamped }),
      tree,
    );
    // The gate is UNDETERMINED, not failed: the only leaf that fails is one the
    // server cannot evaluate, so it must stay out of blockedBy — otherwise the
    // report contradicts its own "`unknown` is not a blocker" contract.
    expect(r.blockedBy).not.toContain('start_rules');
    expect(r.gates.find((g) => g.id === 'start_rules')?.status).toBe('unknown');
    // With nothing reported as blocked, the old "`unknown` conditions are NOT
    // blockers" disclaimer is gone too — there is no longer a contradiction to
    // explain away. The summary just says what to do next.
    expect(r.summary).toMatch(/no server-side blocker/i);
    expect(r.summary).toContain('pass `companyId`');
  });

  it('live-only leaf alone → undetermined, not blocked (every tracker hit this)', () => {
    // A start rule whose only condition is "is this element on the page" can never
    // be decided server-side. It used to fold to unmatched and put start_rules in
    // blockedBy, so the summary read "Blocked by: start_rules" and, in the same
    // sentence, "`unknown` conditions are NOT blockers". Trackers are gated on
    // exactly this, so 100% of them reported as blocked.
    const stamped: RulesCondition[] = [
      { id: 'e1', type: RulesType.ELEMENT, data: {}, operators: 'and', actived: false } as any,
    ];
    const readable = [{ type: 'element', state: 'present', target: { selector: '#cta' } }] as any;
    const tree = annotateConditions(stamped, readable, false);
    const r = buildDiagnoseReport(
      facts({ startRulesActive: false, autoStartRules: stamped }),
      tree,
    );
    expect(r.blockedBy).not.toContain('start_rules');
    expect(r.gates.find((g) => g.id === 'start_rules')?.status).toBe('unknown');
    expect(r.summary).not.toMatch(/^Blocked by/);
  });

  it('a definitively unmatched leaf still blocks, even beside an unknown one', () => {
    // The optimistic re-fold must not swallow real failures: with one leaf that
    // is genuinely unmatched AND one that is unknown, the AND group fails no
    // matter what the unknown turns out to be — that is a real block.
    const stamped: RulesCondition[] = [
      attr('enterprise', false),
      { id: 'e1', type: RulesType.ELEMENT, data: {}, operators: 'and', actived: false } as any,
    ];
    const readable = [
      { type: 'attribute', scope: 'user', attribute: 'plan_tier', op: 'is', value: 'enterprise' },
      { type: 'element', state: 'present', target: { selector: '#cta' } },
    ] as any;
    const tree = annotateConditions(stamped, readable, false);
    const r = buildDiagnoseReport(
      facts({ startRulesActive: false, autoStartRules: stamped }),
      tree,
    );
    expect(r.blockedBy).toContain('start_rules');
    expect(r.gates.find((g) => g.id === 'start_rules')?.status).toBe('fail');
  });

  it('a passing tracker fires its event — summary says fire, not "show" (headless type)', () => {
    // A tracker has no UI; the no-blocker summary must not claim it will "show".
    const r = buildDiagnoseReport(facts({ contentType: ContentDataType.TRACKER }));
    expect(r.blockedBy).toEqual([]);
    expect(r.summary).toMatch(/fires its event/i);
    expect(r.summary).not.toMatch(/should show/i);
  });

  it('render targets surface as an unknown `target` gate, not a blocker', () => {
    // A launcher/tooltip selector the server can't verify — a typo'd anchor otherwise passes
    // every gate yet renders nothing, so make the dependency visible.
    const r = buildDiagnoseReport(facts(), undefined, undefined, ['a[href="/help-center"]']);
    const target = r.gates.find((g) => g.id === 'target');
    expect(target?.status).toBe('unknown');
    expect(target?.detail).toContain('a[href="/help-center"]');
    expect(r.blockedBy).not.toContain('target'); // unknown ≠ blocker
    expect(r.summary).toMatch(/target selector/i); // the green summary flags it too
  });

  it('no render targets → no target gate (e.g. a modal flow)', () => {
    expect(buildDiagnoseReport(facts()).gates.find((g) => g.id === 'target')).toBeUndefined();
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
