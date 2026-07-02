import { collectWriteViolations } from './write-guards';

/**
 * Locks the single write-walk: ALL violations collected in one pass (not
 * throw-on-first), and the entry list — steps, data, startRules, hideRules —
 * covered from one place. The historical bug class was an entry list going
 * stale in one of four independent walkers; these assertions pin the walk.
 */
describe('collectWriteViolations (single write walk)', () => {
  it('collects EVERY violation across steps in one pass, with rules and paths', () => {
    const { issues } = collectWriteViolations({
      steps: [
        {
          name: 'Bad modal',
          type: 'modal',
          placement: { side: 'top', align: 'start' }, // step_shape: tooltip shape on a modal
          onClick: [{ type: 'dismiss' }], // step_shape: onClick off a tooltip
          content: [
            {
              type: 'button',
              text: 'Go',
              hiddenWhen: [{ type: 'segment', segment: 's1', in: true }], // reactive_condition
            },
          ],
          triggers: [
            {
              when: [
                {
                  type: 'group',
                  match: 'all',
                  conditions: [{ type: 'event', event: 'x' }], // reactive_condition (nested in group)
                },
              ],
              do: [{ type: 'dismiss' }],
            },
          ],
        },
      ],
      contentType: 'flow',
    });

    expect(issues.map((i) => i.rule).sort()).toEqual([
      'reactive_condition',
      'reactive_condition',
      'step_shape',
      'step_shape',
    ]);
    expect(issues.map((i) => i.path).sort()).toEqual([
      'steps[0].content[0].hiddenWhen[0]',
      'steps[0].onClick',
      'steps[0].placement',
      'steps[0].triggers[0].when[0].conditions[0]',
    ]);
  });

  it('covers the data entry: per-type actions + button rules + references', () => {
    const { issues, refs } = collectWriteViolations({
      data: {
        items: [
          { name: 'Go', clickActions: [{ type: 'goto_step', step: 'x' }] }, // action_not_allowed
        ],
        content: [
          {
            type: 'button',
            text: 'Later',
            disabledWhen: [{ type: 'content_state', content: 'c1', state: 'seen' }], // reactive + a ref
          },
        ],
      },
      contentType: 'checklist',
    });

    expect(issues.map((i) => i.rule).sort()).toEqual(['action_not_allowed', 'reactive_condition']);
    expect(refs).toEqual([
      {
        id: 'c1',
        path: 'data.content[0].disabledWhen[0]',
        where: "the content's data",
        kind: 'A content-state condition',
      },
    ]);
  });

  it('rejects dismiss only where the type has action slots but no variant (resource center)', () => {
    const dismiss = {
      tabs: [
        { name: 'T', blocks: [{ type: 'action', name: 'x', clickActions: [{ type: 'dismiss' }] }] },
      ],
    };
    expect(
      collectWriteViolations({ data: dismiss, contentType: 'resource-center' }).issues.map(
        (i) => i.rule,
      ),
    ).toEqual(['action_not_allowed']);
    // checklist HAS a dismiss variant → allowed
    expect(
      collectWriteViolations({
        data: { items: [{ name: 'x', clickActions: [{ type: 'dismiss' }] }] },
        contentType: 'checklist',
      }).issues,
    ).toEqual([]);
  });

  it('covers the rules entries: references from start/hide rules + tracker reactive slot', () => {
    const { issues, refs } = collectWriteViolations({
      startRules: { when: [{ type: 'event', event: 'signup' }] },
      hideRules: { when: [{ type: 'content_state', content: 'c9', state: 'seen' }] },
      contentType: 'tracker',
    });
    // the event condition is fine on most types' start rules, but a tracker's
    // start conditions are a reactive slot → rejected
    expect(issues.map((i) => i.rule)).toEqual(['reactive_condition']);
    expect(issues[0].path).toBe('startRules.when[0]');
    expect(refs).toEqual([
      {
        id: 'c9',
        path: 'hideRules.when[0]',
        where: 'a hide rule',
        kind: 'A content-state condition',
      },
    ]);
  });

  it('collects start_content and content-list references with their carriers', () => {
    const { refs } = collectWriteViolations({
      steps: [
        {
          name: 'S',
          type: 'modal',
          content: [
            { type: 'button', text: 'Go', actions: [{ type: 'start_content', content: 'c2' }] },
          ],
        },
      ],
      data: {
        tabs: [
          {
            name: 'T',
            blocks: [
              { type: 'content-list', name: 'L', items: [{ content: 'c3', contentType: 'flow' }] },
            ],
          },
        ],
      },
      contentType: 'resource-center',
    });
    expect(refs.map((r) => [r.id, r.kind])).toEqual([
      ['c2', 'A start_content action'],
      ['c3', 'A resource-center content-list item'],
    ]);
  });

  it('returns nothing for a clean write', () => {
    const out = collectWriteViolations({
      steps: [
        {
          name: 'OK',
          type: 'tooltip',
          target: { selector: '#x' },
          placement: { side: 'bottom', align: 'center' },
          onClick: [{ type: 'dismiss' }],
          triggers: [
            { when: [{ type: 'element', state: 'present', target: { selector: '#y' } }], do: [] },
          ],
        },
      ],
      contentType: 'flow',
    });
    expect(out.issues).toEqual([]);
    expect(out.refs).toEqual([]);
  });
});
