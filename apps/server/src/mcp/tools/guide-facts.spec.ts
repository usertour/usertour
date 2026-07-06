import {
  AUTO_START_CAPABILITIES,
  CONTENT_REFERENCE_TARGET_TYPES,
  STEP_CAPABILITIES,
} from '@usertour/helpers';
import { ContentDataType, StepContentType } from '@usertour/types';

import { REP_CONDITION_TYPE_TO_INTERNAL } from '@/api/content-representation/contract-map';

import { AUTHORING_GUIDE } from './authoring-guide';

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

  it('auto-start knobs: frequency/wait/ifCompleted are flow+checklist; atLeast flow-only; priority adds resource-center; banner+launcher none', () => {
    const typesWith = (cap: 'frequency' | 'atLeast' | 'wait' | 'ifCompleted' | 'priority') =>
      Object.values(ContentDataType)
        .filter((t) => AUTO_START_CAPABILITIES[t][cap])
        .sort();
    // matrix side
    expect(typesWith('frequency')).toEqual(['checklist', 'flow']);
    expect(typesWith('wait')).toEqual(['checklist', 'flow']);
    expect(typesWith('ifCompleted')).toEqual(['checklist', 'flow']);
    expect(typesWith('atLeast')).toEqual(['flow']);
    expect(typesWith('priority')).toEqual(['checklist', 'flow', 'resource-center']);
    // guide side: the sentence carrying the claim
    expect(AUTHORING_GUIDE).toContain(
      '`frequency`, `waitSeconds`, `startIfNotComplete` are **flow + checklist** only',
    );
    expect(AUTHORING_GUIDE).toContain('(`frequency.atLeast`, flow only)');
    expect(AUTHORING_GUIDE).toContain('`priority` is flow + checklist + resource-center');
    expect(AUTHORING_GUIDE).toContain('Banner and launcher accept none of these');
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
    expect(AUTHORING_GUIDE).toContain('a step-level `placement` on a bubble is ignored');
    expect(AUTHORING_GUIDE).toContain('Tooltip steps with a `target` only');
  });
});
