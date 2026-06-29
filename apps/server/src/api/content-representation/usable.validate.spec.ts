import {
  BannerEmbedPlacement,
  ContentDataType,
  LauncherActionType,
  ResourceCenterBlockType,
  StepContentType,
} from '@usertour/types';

import { validateVersionUsable } from './usable.validate';

// One renderable text block in the editor's group→column→element tree.
const textBlocks = [{ children: [{ children: [{ element: { type: 'text', data: {} } }] }] }];
const empty: never[] = [];

const paths = (issues: { path: string }[]) => issues.map((i) => i.path);

describe('validateVersionUsable', () => {
  describe('theme (cross-cutting)', () => {
    it('errors when a UI type has no theme', () => {
      const r = validateVersionUsable({
        type: ContentDataType.FLOW,
        themeId: null,
        steps: [{ type: StepContentType.MODAL, data: textBlocks, sequence: 0, cvid: 'a' } as never],
      });
      expect(r.ok).toBe(false);
      expect(paths(r.errors)).toContain('theme');
    });

    it('does not require a theme for tracker (headless)', () => {
      const r = validateVersionUsable({
        type: ContentDataType.TRACKER,
        themeId: null,
        data: { eventId: 'evt' },
        config: { autoStartRules: [{ type: 'x' } as never] },
      });
      expect(paths(r.errors)).not.toContain('theme');
      expect(r.ok).toBe(true);
    });
  });

  describe('flow', () => {
    const flow = (steps: unknown[]) =>
      validateVersionUsable({ type: ContentDataType.FLOW, themeId: 't', steps: steps as never });

    it('errors on zero steps', () => {
      expect(flow([]).ok).toBe(false);
      expect(paths(flow([]).errors)).toContain('steps');
    });

    it('errors on a tooltip step with no target', () => {
      const r = flow([{ type: StepContentType.TOOLTIP, data: textBlocks, sequence: 0, cvid: 'a' }]);
      expect(r.ok).toBe(false);
    });

    it('accepts a tooltip step with a manual selector', () => {
      const r = flow([
        {
          type: StepContentType.TOOLTIP,
          target: { type: 'manual', customSelector: '#x' },
          data: textBlocks,
          sequence: 0,
          cvid: 'a',
        },
      ]);
      expect(r.ok).toBe(true);
    });

    it('errors on a non-hidden step with no content', () => {
      const r = flow([{ type: StepContentType.MODAL, data: empty, sequence: 0, cvid: 'a' }]);
      expect(r.ok).toBe(false);
    });

    it('exempts hidden steps from the content requirement', () => {
      const r = flow([{ type: StepContentType.HIDDEN, data: empty, sequence: 0, cvid: 'a' }]);
      expect(r.ok).toBe(true);
    });

    it('errors on a button with no action (missing required data)', () => {
      const r = flow([
        {
          type: StepContentType.MODAL,
          sequence: 0,
          cvid: 'a',
          data: [
            {
              children: [
                { children: [{ element: { type: 'button', data: { text: 'Go', actions: [] } } }] },
              ],
            },
          ],
        },
      ]);
      expect(r.ok).toBe(false);
    });

    it('errors on a goto_step pointing at a non-existent step', () => {
      const r = flow([
        {
          type: StepContentType.MODAL,
          sequence: 0,
          cvid: 'a',
          data: [
            {
              children: [
                {
                  children: [
                    {
                      element: {
                        type: 'button',
                        data: {
                          text: 'Next',
                          actions: [{ type: 'step-goto', data: { stepCvid: 'ghost' } }],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.message.includes('does not exist'))).toBe(true);
    });

    it('errors on an image block with an empty url', () => {
      const r = flow([
        {
          type: StepContentType.MODAL,
          sequence: 0,
          cvid: 'a',
          data: [{ children: [{ children: [{ element: { type: 'image', url: '' } }] }] }],
        },
      ]);
      expect(r.ok).toBe(false);
    });

    it('warns (not errors) on an unreachable non-first step', () => {
      const r = flow([
        { type: StepContentType.MODAL, data: textBlocks, sequence: 0, cvid: 'a' },
        { type: StepContentType.MODAL, data: textBlocks, sequence: 1, cvid: 'b' },
      ]);
      expect(r.ok).toBe(true); // unreachable is advisory
      expect(paths(r.warnings)).toContain('steps[1]');
    });
  });

  describe('checklist', () => {
    const checklist = (items: unknown[]) =>
      validateVersionUsable({ type: ContentDataType.CHECKLIST, themeId: 't', data: { items } });

    it('errors on no items', () => {
      expect(checklist([]).ok).toBe(false);
    });

    it('errors on an item with no name', () => {
      const r = checklist([{ name: '', clickedActions: [{}], completeConditions: [] }]);
      expect(r.ok).toBe(false);
    });

    it('errors on an item that does nothing (no action, no completion condition)', () => {
      const r = checklist([{ name: 'Task', clickedActions: [], completeConditions: [] }]);
      expect(r.ok).toBe(false);
    });

    it('accepts an item with a click action', () => {
      const r = checklist([
        { name: 'Task', clickedActions: [{ type: 'x' }], completeConditions: [] },
      ]);
      expect(r.ok).toBe(true);
    });
  });

  describe('launcher', () => {
    it('errors with no target', () => {
      const r = validateVersionUsable({
        type: ContentDataType.LAUNCHER,
        themeId: 't',
        data: { target: { element: undefined }, behavior: { actionType: 'x' } },
      });
      expect(r.ok).toBe(false);
    });

    it('errors when show-tooltip has no tooltip content', () => {
      const r = validateVersionUsable({
        type: ContentDataType.LAUNCHER,
        themeId: 't',
        data: {
          target: { element: { customSelector: '#x' } },
          behavior: { actionType: LauncherActionType.SHOW_TOOLTIP },
          tooltip: { content: [] },
        },
      });
      expect(r.ok).toBe(false);
    });

    it('errors when perform-action has no actions', () => {
      const r = validateVersionUsable({
        type: ContentDataType.LAUNCHER,
        themeId: 't',
        data: {
          target: { element: { customSelector: '#x' } },
          behavior: { actionType: LauncherActionType.PERFORM_ACTION, actions: [] },
        },
      });
      expect(r.ok).toBe(false);
    });

    it('accepts a show-tooltip launcher with target + content', () => {
      const r = validateVersionUsable({
        type: ContentDataType.LAUNCHER,
        themeId: 't',
        data: {
          target: { element: { customSelector: '#x' } },
          behavior: { actionType: LauncherActionType.SHOW_TOOLTIP },
          tooltip: { content: textBlocks },
        },
      });
      expect(r.ok).toBe(true);
    });
  });

  describe('banner', () => {
    it('errors on empty content', () => {
      const r = validateVersionUsable({
        type: ContentDataType.BANNER,
        themeId: 't',
        data: { embedPlacement: BannerEmbedPlacement.TOP_OF_PAGE, contents: [] },
      });
      expect(r.ok).toBe(false);
    });

    it('errors when element-relative placement has no container', () => {
      const r = validateVersionUsable({
        type: ContentDataType.BANNER,
        themeId: 't',
        data: {
          embedPlacement: BannerEmbedPlacement.IMMEDIATELY_BEFORE_ELEMENT,
          contents: textBlocks,
        },
      });
      expect(r.ok).toBe(false);
      expect(paths(r.errors)).toContain('containerElement');
    });

    it('accepts a top-of-page banner with content', () => {
      const r = validateVersionUsable({
        type: ContentDataType.BANNER,
        themeId: 't',
        data: { embedPlacement: BannerEmbedPlacement.TOP_OF_PAGE, contents: textBlocks },
      });
      expect(r.ok).toBe(true);
    });
  });

  describe('resource-center', () => {
    it('errors on no tabs', () => {
      const r = validateVersionUsable({
        type: ContentDataType.RESOURCE_CENTER,
        themeId: 't',
        data: { tabs: [] },
      });
      expect(r.ok).toBe(false);
    });

    it('errors on a tab with no name or no renderable block', () => {
      const r = validateVersionUsable({
        type: ContentDataType.RESOURCE_CENTER,
        themeId: 't',
        data: { tabs: [{ name: '', blocks: [{ type: ResourceCenterBlockType.DIVIDER }] }] },
      });
      expect(r.ok).toBe(false);
    });

    it('accepts a tab with a name and a rich-text block', () => {
      const r = validateVersionUsable({
        type: ContentDataType.RESOURCE_CENTER,
        themeId: 't',
        data: {
          tabs: [
            {
              name: 'Home',
              blocks: [{ type: ResourceCenterBlockType.RICH_TEXT, content: textBlocks }],
            },
          ],
        },
      });
      expect(r.ok).toBe(true);
    });
  });

  describe('tracker', () => {
    it('errors with no eventId or no autoStartRules', () => {
      expect(
        validateVersionUsable({ type: ContentDataType.TRACKER, themeId: null, data: {} }).ok,
      ).toBe(false);
    });

    it('accepts an eventId + trigger conditions', () => {
      const r = validateVersionUsable({
        type: ContentDataType.TRACKER,
        themeId: null,
        data: { eventId: 'evt' },
        config: { autoStartRules: [{ type: 'x' } as never] },
      });
      expect(r.ok).toBe(true);
    });

    // A tracker may only fire a CUSTOM event — the builder hides built-in
    // (predefined) events; the API must reject them too (needs conditionContext.events).
    const trackerCtx = (predefined: boolean) =>
      ({
        attributes: [{ id: 'a1', dataType: 2, bizType: 1 }],
        events: [{ id: 'ev1', codeName: 'an_event', predefined }],
      }) as never;
    const trackerRule = [
      { type: 'user-attr', operators: 'and', data: { attrId: 'a1', logic: 'is', value: 'x' } },
    ] as never;

    it('rejects a built-in (predefined) event', () => {
      const r = validateVersionUsable({
        type: ContentDataType.TRACKER,
        themeId: null,
        data: { eventId: 'ev1' },
        config: { autoStartRules: trackerRule },
        conditionContext: trackerCtx(true),
      });
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => /custom event/i.test(e.message))).toBe(true);
    });

    it('accepts a custom (non-predefined) event', () => {
      const r = validateVersionUsable({
        type: ContentDataType.TRACKER,
        themeId: null,
        data: { eventId: 'ev1' },
        config: { autoStartRules: trackerRule },
        conditionContext: trackerCtx(false),
      });
      expect(r.ok).toBe(true);
    });

    it('rejects a dangling event (not in the project) — existence before predefined', () => {
      const r = validateVersionUsable({
        type: ContentDataType.TRACKER,
        themeId: null,
        data: { eventId: 'ghost' }, // not 'ev1'
        config: { autoStartRules: trackerRule },
        conditionContext: trackerCtx(false),
      });
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => /unknown event/.test(e.message))).toBe(true);
    });
  });

  // Semantic condition validation — only runs when the caller supplies the
  // project reference lists. Catches conditions that compile but are broken
  // (dangling refs, an operator the attribute type can't use, missing values).
  describe('semantic conditions (conditionContext)', () => {
    // a1 = String user attribute (dataType 2).
    const ctx = {
      attributes: [{ id: 'a1', dataType: 2, bizType: 1 }],
      segments: [{ id: 's1' }],
      contents: [{ id: 'c1' }],
      events: [{ id: 'e1' }],
    } as never;
    const run = (cond: unknown) =>
      validateVersionUsable({
        type: ContentDataType.FLOW,
        themeId: 't1',
        steps: empty,
        config: { autoStartRules: [cond] as never },
        conditionContext: ctx,
      });
    // Condition errors are pathed under `config.…`; flow's own errors are not.
    const condErrors = (r: { errors: { path: string; message: string }[] }) =>
      r.errors.filter((e) => e.path.startsWith('config'));

    it('passes a valid user-attr condition', () => {
      const r = run({
        type: 'user-attr',
        operators: 'and',
        data: { attrId: 'a1', logic: 'is', value: 'pro' },
      });
      expect(condErrors(r)).toHaveLength(0);
    });

    it('flags a dangling attribute reference (the `?? code` hole)', () => {
      const r = run({
        type: 'user-attr',
        operators: 'and',
        data: { attrId: 'gone', logic: 'is', value: 'x' },
      });
      expect(condErrors(r)[0]?.message).toMatch(/unknown attribute/);
    });

    // The RC content-list existence check read `obj.items`, but the compiled block
    // stores `contentItems` — so it silently never fired. These lock the fix.
    it('flags a dangling resource-center content-list reference', () => {
      const r = validateVersionUsable({
        type: ContentDataType.RESOURCE_CENTER,
        themeId: 't1',
        data: {
          tabs: [
            {
              name: 'g',
              blocks: [
                {
                  type: 'content-list',
                  contentItems: [{ contentId: 'gone', contentType: 'flow' }],
                },
              ],
            },
          ],
        },
        config: { autoStartRules: [{ type: 'current-page' } as never] },
        conditionContext: ctx,
      });
      expect(
        r.errors.some((e) => /resource-center item references unknown content/.test(e.message)),
      ).toBe(true);
    });

    it('accepts a resource-center content-list reference to existing content', () => {
      const r = validateVersionUsable({
        type: ContentDataType.RESOURCE_CENTER,
        themeId: 't1',
        data: {
          tabs: [
            {
              name: 'g',
              blocks: [
                { type: 'content-list', contentItems: [{ contentId: 'c1', contentType: 'flow' }] },
              ],
            },
          ],
        },
        config: { autoStartRules: [{ type: 'current-page' } as never] },
        conditionContext: ctx,
      });
      expect(r.errors.some((e) => /references unknown content/.test(e.message))).toBe(false);
    });

    it('flags an operator the attribute type does not support', () => {
      // String attr can't use a List operator.
      const r = run({
        type: 'user-attr',
        operators: 'and',
        data: { attrId: 'a1', logic: 'includesAll', value: 'x' },
      });
      expect(condErrors(r)[0]?.message).toMatch(/not valid/);
    });

    it('flags a missing required value', () => {
      const r = run({ type: 'user-attr', operators: 'and', data: { attrId: 'a1', logic: 'is' } });
      expect(condErrors(r)[0]?.message).toMatch(/missing a required value/);
    });

    it('flags a dangling segment reference', () => {
      const r = run({
        type: 'segment',
        operators: 'and',
        data: { segmentId: 'gone', logic: 'is' },
      });
      expect(condErrors(r)[0]?.message).toMatch(/unknown segment/);
    });

    it('validates conditions nested in a group', () => {
      const r = run({
        type: 'group',
        operators: 'and',
        conditions: [
          { type: 'segment', operators: 'or', data: { segmentId: 'gone', logic: 'is' } },
        ],
      });
      expect(condErrors(r).some((e) => /unknown segment/.test(e.message))).toBe(true);
    });

    it('skips condition validation when no context is supplied', () => {
      const r = validateVersionUsable({
        type: ContentDataType.FLOW,
        themeId: 't1',
        steps: empty,
        config: {
          autoStartRules: [{ type: 'user-attr', data: { attrId: 'gone', logic: 'is' } }] as never,
        },
      });
      expect(r.errors.some((e) => e.path.startsWith('config'))).toBe(false);
    });
  });

  // Question config (renderability) — the builder's question editors enforce
  // these; the API has no editor, so an agent can author an unanswerable question.
  describe('question bindAttribute existence (conditionContext)', () => {
    // a1 has codeName "plan"; binding a question to a missing codeName should warn.
    const ctx = {
      attributes: [{ id: 'a1', dataType: 2, bizType: 1, codeName: 'plan' }],
      segments: [],
      contents: [],
      events: [],
    } as never;
    const withBoundQuestion = (codeName: string) =>
      validateVersionUsable({
        type: ContentDataType.FLOW,
        themeId: 't1',
        steps: [
          {
            type: StepContentType.MODAL,
            sequence: 0,
            cvid: 'a',
            data: [
              {
                children: [
                  {
                    children: [
                      {
                        element: {
                          type: 'single-line-text',
                          data: { name: 'Q', bindToAttribute: true, selectedAttribute: codeName },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ] as never,
        conditionContext: ctx,
      });
    const bindWarn = (r: { warnings: { message: string }[] }) =>
      r.warnings.some((w) => /binds to attribute/.test(w.message));

    it('warns (not errors) when a question binds to a non-existent attribute', () => {
      const r = withBoundQuestion('typo_plan');
      expect(bindWarn(r)).toBe(true);
      expect(r.errors.some((e) => /binds to attribute/.test(e.message))).toBe(false);
    });

    it('does not warn when the bound attribute exists', () => {
      expect(bindWarn(withBoundQuestion('plan'))).toBe(false);
    });
  });

  describe('question config', () => {
    const withQuestion = (element: unknown) =>
      validateVersionUsable({
        type: ContentDataType.FLOW,
        themeId: 't',
        steps: [
          {
            type: StepContentType.MODAL,
            sequence: 0,
            cvid: 'a',
            data: [{ children: [{ children: [{ element }] }] }],
          },
        ] as never,
      });
    const has = (r: { errors: { message: string }[] }, re: RegExp) =>
      r.errors.some((e) => re.test(e.message));

    it('flags a multiple-choice question with no options', () => {
      const r = withQuestion({ type: 'multiple-choice', data: { name: 'Q', options: [] } });
      expect(has(r, /at least one option/)).toBe(true);
    });

    it('flags a scale question with an invalid range (low > high)', () => {
      const r = withQuestion({ type: 'scale', data: { name: 'Q', lowRange: 10, highRange: 1 } });
      expect(has(r, /range must be/)).toBe(true);
    });

    it('flags a scale range out of bounds (high > 100)', () => {
      const r = withQuestion({ type: 'scale', data: { name: 'Q', lowRange: 0, highRange: 500 } });
      expect(has(r, /range must be/)).toBe(true);
    });

    it('accepts a valid scale and a populated multiple-choice', () => {
      expect(
        has(
          withQuestion({ type: 'scale', data: { name: 'Q', lowRange: 0, highRange: 10 } }),
          /range/,
        ),
      ).toBe(false);
      expect(
        has(
          withQuestion({
            type: 'multiple-choice',
            data: { name: 'Q', options: [{ label: 'A', value: 'a' }] },
          }),
          /option/,
        ),
      ).toBe(false);
    });

    it('errors on a step with more than one question (one question per step)', () => {
      const r = validateVersionUsable({
        type: ContentDataType.FLOW,
        themeId: 't',
        steps: [
          {
            type: StepContentType.MODAL,
            sequence: 0,
            cvid: 'a',
            data: [
              {
                children: [
                  {
                    children: [
                      { element: { type: 'nps', data: { name: 'Q1' } } },
                      {
                        element: {
                          type: 'scale',
                          data: { name: 'Q2', lowRange: 0, highRange: 10 },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ] as never,
      });
      expect(has(r, /more than one question/)).toBe(true);
    });

    it('accepts a step with exactly one question', () => {
      const r = withQuestion({ type: 'nps', data: { name: 'Q' } });
      expect(has(r, /more than one question/)).toBe(false);
    });
  });

  describe('auto-start (cross-cutting)', () => {
    const warnsNoStart = (input: Parameters<typeof validateVersionUsable>[0]) =>
      paths(validateVersionUsable(input).warnings).includes('config.autoStartRules');

    it('warns when a resource center has no start rules', () => {
      expect(warnsNoStart({ type: ContentDataType.RESOURCE_CENTER, themeId: 't' })).toBe(true);
    });

    it('warns when a launcher has no start rules', () => {
      expect(warnsNoStart({ type: ContentDataType.LAUNCHER, themeId: 't' })).toBe(true);
    });

    it('warns when a banner has no start rules', () => {
      expect(warnsNoStart({ type: ContentDataType.BANNER, themeId: 't' })).toBe(true);
    });

    it('does not warn once a start rule is present', () => {
      expect(
        warnsNoStart({
          type: ContentDataType.RESOURCE_CENTER,
          themeId: 't',
          config: { autoStartRules: [{ type: 'current-page' } as never] },
        }),
      ).toBe(false);
    });

    it('does not warn for a flow with no start rules (manual start is normal)', () => {
      expect(warnsNoStart({ type: ContentDataType.FLOW, themeId: 't' })).toBe(false);
    });
  });
});
