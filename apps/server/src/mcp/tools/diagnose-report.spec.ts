import { ContentDataType, RulesCondition } from '@usertour/types';

import { decompileConditions } from '@/api/content-representation/rules.decompile';
import type { DiagnoseFacts } from '@/web-socket/core/content-diagnosis.service';

import { annotateConditions, buildDiagnoseReport } from './diagnose-report';

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
    // biome-ignore lint/suspicious/noConsole: sample output for design review
    console.log(`\n### annotated start tree\n${JSON.stringify(tree, null, 2)}`);

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
});

describe('buildDiagnoseReport (gate checklist + summary)', () => {
  it('start_rules blocked: names the gate and carries the annotated tree', () => {
    const stamped: RulesCondition[] = [attr('enterprise', false)];
    const tree = annotateConditions(stamped, decompileConditions(stamped, resolvers), true);
    const r = buildDiagnoseReport(
      facts({ startRulesActive: false, autoStartRules: stamped }),
      tree,
    );
    // biome-ignore lint/suspicious/noConsole: sample output for design review
    console.log(`\n### report (start_rules blocked)\n${JSON.stringify(r, null, 2)}`);
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

  it('not published / no user / active session summaries', () => {
    expect(buildDiagnoseReport(facts({ published: false })).blockedBy).toEqual(['published']);
    expect(buildDiagnoseReport(facts({ userId: undefined })).summary).toMatch(/pass a userId/i);
    expect(buildDiagnoseReport(facts({ userFound: false })).blockedBy).toEqual(['identified']);
    expect(buildDiagnoseReport(facts({ hasActiveSession: true })).summary).toMatch(
      /currently active/i,
    );
  });
});
