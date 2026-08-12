import {
  AUTO_START_CAPABILITIES,
  CONTENT_ACTION_CAPABILITIES,
  CONTENT_REFERENCE_TARGET_TYPES,
  CONTENT_TYPE_TRAITS,
  STEP_CAPABILITIES,
} from '@usertour/helpers';
import { ContentDataType, StepContentType } from '@usertour/types';

import { REP_CONDITION_TYPE_TO_INTERNAL } from '@/api/content-representation/contract-map';

import {
  AUTHORING_GUIDE,
  CORE_GUIDE_SECTIONS,
  GUIDE_SECTIONS,
  guideSectionNamesFor,
} from './authoring-guide';

/**
 * Ties the authoring guide's load-bearing capability CLAIMS to the capability
 * matrix — the guide is hand-written prose and has lied before (a sequencing
 * example gated on a banner being `seen`; the trigger section claimed `when`
 * takes the full condition set). Each fact is pinned twice:
 *  - matrix → expectation: if the matrix rule changes, the expectation fails,
 *    forcing whoever changed it to re-read (and update) the guide;
 *  - guide → expectation: if the guide sentence carrying the claim is reworded
 *    away, the containment check fails, forcing this spec to follow the text.
 * The guide can still phrase things freely — only the claim-carrying fragments
 * are pinned.
 */
describe('authoring guide facts (locked to the capability matrix)', () => {
  it('condition vocabulary: the guide lists exactly the representation type names', () => {
    // matrix side: the codec's general vocabulary
    const types = Object.keys(REP_CONDITION_TYPE_TO_INTERNAL);
    expect(types.sort()).toEqual([
      'attribute',
      'content_state',
      'current_url',
      'element',
      'event',
      'group',
      'segment',
      'text_filled',
      'text_input',
      'time_window',
    ]);
    // guide side: every name appears; the retired names don't
    for (const type of types) {
      expect(AUTHORING_GUIDE).toContain(`\`${type}\``);
    }
    expect(AUTHORING_GUIDE).not.toContain('start_flow');
    expect(AUTHORING_GUIDE).not.toContain('"type": "flow"');
  });

  it('auto-start knobs: frequency/wait/ifCompleted are flow+checklist; atLeast flow-only; priority adds resource-center + banner; launcher none', () => {
    const typesWith = (cap: 'frequency' | 'atLeast' | 'wait' | 'ifCompleted' | 'priority') =>
      Object.values(ContentDataType)
        .filter((t) => AUTO_START_CAPABILITIES[t][cap])
        .sort();
    // matrix side
    expect(typesWith('frequency')).toEqual(['checklist', 'flow']);
    expect(typesWith('wait')).toEqual(['checklist', 'flow']);
    expect(typesWith('ifCompleted')).toEqual(['checklist', 'flow']);
    expect(typesWith('atLeast')).toEqual(['flow']);
    expect(typesWith('priority')).toEqual(['banner', 'checklist', 'flow', 'resource-center']);
    // guide side: the sentence carrying the claim
    expect(AUTHORING_GUIDE).toContain(
      '`frequency`, `waitSeconds`, `startIfNotComplete` are **flow + checklist** only',
    );
    expect(AUTHORING_GUIDE).toContain('(`frequency.atLeast`, flow only)');
    expect(AUTHORING_GUIDE).toContain(
      '`priority` is flow + checklist + resource-center + **banner**',
    );
    expect(AUTHORING_GUIDE).toContain(
      'Launcher accepts none of these, and banner accepts ONLY `priority`',
    );
  });

  it('cross-content references: target must be a flow or checklist', () => {
    expect([...CONTENT_REFERENCE_TARGET_TYPES].sort()).toEqual(['checklist', 'flow']);
    expect(AUTHORING_GUIDE).toContain('must be a **flow or a checklist**');
    expect(AUTHORING_GUIDE).toContain('REJECTED at write');
  });

  it('reactive slots: the guide names the client-evaluable subset for triggers', () => {
    // matrix side: exactly event/segment/content_state are server-evaluated
    const serverEvaluated = Object.keys(REP_CONDITION_TYPE_TO_INTERNAL).filter(
      (t) =>
        ![
          'attribute',
          'current_url',
          'element',
          'text_input',
          'text_filled',
          'time_window',
          'group',
        ].includes(t),
    );
    expect(serverEvaluated.sort()).toEqual(['content_state', 'event', 'segment']);
    // guide side: the trigger section states the restriction
    expect(AUTHORING_GUIDE).toContain(
      '`event` / `segment` / `content_state` are server-evaluated and rejected here',
    );
  });

  it('step placement: tooltip anchors, modal uses the grid, bubble is theme-driven', () => {
    expect(STEP_CAPABILITIES[StepContentType.TOOLTIP].placement).toBe('anchor');
    expect(STEP_CAPABILITIES[StepContentType.MODAL].placement).toBe('grid');
    expect(STEP_CAPABILITIES[StepContentType.BUBBLE].placement).toBe('theme');
    expect(STEP_CAPABILITIES[StepContentType.TOOLTIP].onClick).toBe(true);
    expect(STEP_CAPABILITIES[StepContentType.MODAL].onClick).toBe(false);
    expect(AUTHORING_GUIDE).toContain('**Placement is shaped by the step kind**');
    expect(AUTHORING_GUIDE).toContain(
      'positional keys in a step-level `placement` on a bubble are rejected',
    );
    expect(AUTHORING_GUIDE).toContain('Tooltip steps with a `target` only');
  });

  it('theme requirement: every type but tracker needs a theme, and the guide says both halves', () => {
    // matrix side
    const themeless = Object.entries(CONTENT_TYPE_TRAITS)
      .filter(([, t]) => !t.requiresTheme)
      .map(([type]) => type);
    expect(themeless).toEqual(['tracker']);
    // guide side: the universal claim + the tracker exception
    expect(AUTHORING_GUIDE).toContain('Every visual type needs a theme or the SDK renders nothing');
    expect(AUTHORING_GUIDE).toContain('no theme (it has no UI)');
  });

  it('persistent surfaces need start rules to appear: matrix trio matches the guide claim', () => {
    // matrix side
    const trio = Object.entries(CONTENT_TYPE_TRAITS)
      .filter(([, t]) => t.autoStartRequiredToAppear)
      .map(([type]) => type)
      .sort();
    expect(trio).toEqual(['banner', 'launcher', 'resource-center']);
    // guide side: the claim carriers (validate section + start-rules section)
    expect(AUTHORING_GUIDE).toContain('a persistent surface with no start rules');
    expect(AUTHORING_GUIDE).toContain('Banner, Launcher, and Resource Center are single-session');
  });

  it('resource center has no dismiss: matrix null variant matches the guide claim', () => {
    expect(CONTENT_ACTION_CAPABILITIES[ContentDataType.RESOURCE_CENTER].dismissVariant).toBeNull();
    expect(AUTHORING_GUIDE).toContain('NO dismiss affordance');
  });
});

describe('guide sections (the structure the slicing tool serves)', () => {
  it('section names are unique and appliesTo values are real content types', () => {
    const names = GUIDE_SECTIONS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    const types = Object.values(ContentDataType) as string[];
    for (const s of GUIDE_SECTIONS) {
      if (s.appliesTo === 'all') continue;
      for (const t of s.appliesTo) {
        expect(types).toContain(t);
      }
    }
  });

  it('core sections exist and every section carries a title, summary, and body', () => {
    const names = GUIDE_SECTIONS.map((s) => s.name);
    for (const core of CORE_GUIDE_SECTIONS) {
      expect(names).toContain(core);
    }
    for (const s of GUIDE_SECTIONS) {
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.summary.trim().length).toBeGreaterThan(0);
      expect(s.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('type-specific sections land on their type; universal sections reach every type', () => {
    expect(guideSectionNamesFor(ContentDataType.FLOW)).toEqual(
      expect.arrayContaining(['flow-steps', 'surveys', 'orchestration']),
    );
    expect(guideSectionNamesFor(ContentDataType.RESOURCE_CENTER)).toEqual(
      expect.arrayContaining(['live-chat', 'announcements', 'icons']),
    );
    expect(guideSectionNamesFor(ContentDataType.ANNOUNCEMENT)).toEqual(
      expect.arrayContaining(['announcements']),
    );
    expect(guideSectionNamesFor(ContentDataType.BANNER)).not.toEqual(
      expect.arrayContaining(['surveys']),
    );
    for (const t of Object.values(ContentDataType)) {
      expect(guideSectionNamesFor(t)).toEqual(
        expect.arrayContaining([
          'lifecycle',
          'conditions',
          'start-rules',
          'sdk',
          'publish-requirements',
        ]),
      );
    }
  });
});
