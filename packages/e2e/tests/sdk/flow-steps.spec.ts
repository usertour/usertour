import type { Page } from '@playwright/test';
import { defaultSettings } from '@usertour/constants';
import {
  button,
  checklistSession,
  dismissFlow,
  flowSession,
  gotoStep,
  modalFlow,
  navigate,
  paragraph,
  row,
  startFlow,
  twoStepFlow,
} from './content';
import { type SdkPage, expect, test } from './fixtures';

/**
 * What a flow's steps do at runtime beyond showing and ending (flow.spec.ts):
 * step types and settings, how a tooltip finds and follows its target, step
 * triggers, the actions buttons and targets run, button rules, and how a
 * flow and a checklist take turns.
 */

const STEP_TEXT = 'Click here to begin';

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

/** Show step 2 of `twoStepFlow`: the tooltip on `target`. */
const showTooltip = async (
  protocol: { push: (kind: string, payload: unknown) => Promise<unknown> },
  target = '#cta',
  themeSettings?: unknown,
) => {
  await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', target, themeSettings));
  await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
};

const addButton = (page: Page, id: string, text: string, style = '') =>
  page.evaluate(
    ({ id, text, style }) => {
      const element = document.createElement('button');
      element.id = id;
      element.textContent = text;
      element.style.cssText = style;
      document.querySelector('main')?.appendChild(element);
    },
    { id, text, style },
  );

const elementPresent = (selector: string) => ({
  id: `present:${selector}`,
  type: 'element',
  operators: 'and',
  data: {
    logic: 'present',
    elementData: { type: 'manual', customSelector: selector, sequence: '1st' },
  },
});

const goToStepIds = (protocol: { messages: (kind: string) => Array<{ message: unknown }> }) =>
  protocol
    .messages('GoToStep')
    .map((seen) => (seen.message as { payload: { stepId: string } }).payload.stepId);

const useBubble = {
  ...defaultSettings,
  tooltip: { ...defaultSettings.tooltip, missingTargetBehavior: 'use-bubble' },
};

test.describe('the session', () => {
  test('the same session pushed again updates the open step in place', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await showTooltip(protocol);
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();

    const updated = structuredClone(twoStepFlow('session-1', 'flow-1'));
    updated.version.steps[1].data = [
      row(paragraph('Click here, please')),
      row(button('Done', [dismissFlow()])),
    ];
    await protocol.push('SetFlowSession', updated);
    await expect(sdk.frame().getByText('Click here, please')).toBeVisible();
    await expect(sdk.frame().getByText('Welcome aboard')).toHaveCount(0);
    expect(goToStepIds(protocol)).toEqual([]);
  });

  test('the checklist a flow collapsed opens again when the flow ends', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklistSession({
        sessionId: 'checklist-session-1',
        contentId: 'checklist-1',
        tasks: [{ id: 'invite', name: 'Invite your team' }],
      }),
    );
    const task = sdk.frame().getByRole('button', { name: 'Complete task: Invite your team' });
    await expect(task).toBeVisible();
    await protocol.push('SetFlowSession', modalFlow('session-1', 'flow-1', [row(paragraph('Hi'))]));
    await protocol.waitForMessages('HideChecklist', 1);

    await sdk.frame().getByRole('button', { name: 'Close' }).click();
    await protocol.waitForMessages('EndContent', 1);
    await protocol.waitForMessages('ShowChecklist', 2);
    await expect(task).toBeVisible();
  });

  test('a checklist that arrives while a flow runs stays collapsed until the flow ends', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', modalFlow('session-1', 'flow-1', [row(paragraph('Hi'))]));
    await expect(sdk.frame().getByText('Hi')).toBeVisible();
    await protocol.push(
      'SetChecklistSession',
      checklistSession({
        sessionId: 'checklist-session-1',
        contentId: 'checklist-1',
        tasks: [{ id: 'invite', name: 'Invite your team' }],
      }),
    );
    await expect(sdk.page.locator('iframe.usertour-widget-checklist-launcher')).toBeVisible();
    await sdk.advance(500);
    expect(protocol.messages('ShowChecklist')).toHaveLength(0);

    await sdk.frame().getByRole('button', { name: 'Close' }).click();
    await protocol.waitForMessages('ShowChecklist', 1);
    await expect(
      sdk.frame().getByRole('button', { name: 'Complete task: Invite your team' }),
    ).toBeVisible();
  });
});

test.describe('step types and settings', () => {
  test('a bubble step sits by its avatar, which folds it away and back', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetFlowSession',
      flowSession({
        sessionId: 'session-1',
        contentId: 'flow-1',
        steps: [
          {
            id: 'flow-1-step-1',
            cvid: 'flow-1-cvid-1',
            type: 'bubble',
            data: [row(paragraph('Need a hand?'))],
          },
        ],
      }),
    );
    const avatar = sdk.page.locator('iframe.usertour-widget-bubble__avatar');
    // Folded away, the bubble fades out and shrinks towards its avatar.
    const shell = sdk.page.locator('.usertour-widget-surface-shell');
    await expect(avatar).toBeVisible();
    await expect(sdk.frame().getByText('Need a hand?')).toBeVisible();

    await avatar.click();
    await expect(shell).toHaveClass(/usertour-widget-surface-shell--minimized/);
    await expect(shell).toHaveCSS('opacity', '0');
    await avatar.click();
    await expect(shell).not.toHaveClass(/usertour-widget-surface-shell--minimized/);
    await expect(shell).toHaveCSS('opacity', '1');
  });

  test('a hidden step shows nothing, is reported, and its trigger moves the flow on', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetFlowSession',
      flowSession({
        sessionId: 'session-1',
        contentId: 'flow-1',
        steps: [
          {
            id: 'flow-1-step-1',
            cvid: 'flow-1-cvid-1',
            type: 'modal',
            data: [
              row(paragraph('Welcome aboard')),
              row(button('Next', [gotoStep('flow-1-cvid-2')])),
            ],
          },
          {
            id: 'flow-1-step-2',
            cvid: 'flow-1-cvid-2',
            type: 'hidden',
            data: [],
            trigger: [
              {
                id: 'trigger-1',
                conditions: [elementPresent('#go-on')],
                actions: [gotoStep('flow-1-cvid-3')],
                wait: 0,
              },
            ],
          },
          {
            id: 'flow-1-step-3',
            cvid: 'flow-1-cvid-3',
            type: 'modal',
            data: [row(paragraph('All set'))],
          },
        ],
      }),
    );
    await sdk.frame().getByRole('button', { name: 'Next' }).click();
    await protocol.waitForMessages('GoToStep', 1);
    await sdk.advance(600);
    await expect(sdk.surface).toHaveCount(0);

    await addButton(sdk.page, 'go-on', 'Go on');
    await sdk.advance(600);
    await expect(sdk.frame().getByText('All set')).toBeVisible();
    expect(goToStepIds(protocol)).toEqual(['flow-1-step-2', 'flow-1-step-3']);
  });

  test('a step that is not skippable has no close button', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetFlowSession',
      flowSession({
        sessionId: 'session-1',
        contentId: 'flow-1',
        steps: [
          {
            id: 'flow-1-step-1',
            cvid: 'flow-1-cvid-1',
            type: 'modal',
            setting: { skippable: false },
            data: [row(paragraph('Stay a while'))],
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText('Stay a while')).toBeVisible();
    await expect(sdk.frame().getByRole('button', { name: 'Close' })).toHaveCount(0);
  });

  for (const behavior of ['do-nothing', 'dismiss-flow'] as const) {
    test(`a click on a modal's backdrop, with the theme set to ${behavior}`, async ({
      sdk,
      protocol,
    }) => {
      await start(sdk);
      await protocol.push(
        'SetFlowSession',
        flowSession({
          sessionId: 'session-1',
          contentId: 'flow-1',
          themeSettings: {
            ...defaultSettings,
            modal: { ...defaultSettings.modal, backdropClickBehavior: behavior },
          },
          steps: [
            {
              id: 'flow-1-step-1',
              cvid: 'flow-1-cvid-1',
              type: 'modal',
              setting: { enabledBackdrop: true },
              data: [row(paragraph('Look here'))],
            },
          ],
        }),
      );
      await expect(sdk.frame().getByText('Look here')).toBeVisible();
      await sdk.page.mouse.click(8, 8);
      if (behavior === 'dismiss-flow') {
        await protocol.waitForMessages('EndContent', 1);
        expect(protocol.messages('EndContent')[0].message.payload).toEqual({
          sessionId: 'session-1',
          endReason: 'backdrop_dismiss',
        });
      } else {
        await sdk.advance(500);
        await sdk.page.waitForTimeout(200);
        expect(protocol.messages('EndContent')).toHaveLength(0);
        await expect(sdk.frame().getByText('Look here')).toBeVisible();
      }
    });
  }

  for (const blockTarget of [true, false]) {
    test(`with the backdrop on, a click on the target ${blockTarget ? 'is blocked' : 'goes through'} when enabledBlockTarget is ${blockTarget}`, async ({
      sdk,
      protocol,
    }) => {
      await start(sdk);
      await sdk.page.evaluate(() =>
        document.getElementById('cta')?.addEventListener('click', () => {
          window.__usertourRecorded.targetClicks = [
            ...(window.__usertourRecorded.targetClicks ?? []),
            'click',
          ];
        }),
      );
      await protocol.push(
        'SetFlowSession',
        flowSession({
          sessionId: 'session-1',
          contentId: 'flow-1',
          steps: [
            {
              id: 'flow-1-step-1',
              cvid: 'flow-1-cvid-1',
              type: 'tooltip',
              target: '#cta',
              setting: { enabledBackdrop: true, enabledBlockTarget: blockTarget },
              data: [row(paragraph(STEP_TEXT))],
            },
          ],
        }),
      );
      await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();
      const box = await sdk.page.locator('#cta').boundingBox();
      if (!box) {
        throw new Error('no #cta');
      }
      await sdk.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await sdk.page.waitForTimeout(200);
      expect(await sdk.recorded('targetClicks')).toEqual(blockTarget ? [] : ['click']);
    });
  }
});

test.describe('the tooltip target', () => {
  for (const [content, found] of [
    ['Get started', true],
    ['Sign up', false],
  ] as const) {
    test(`a target pinned to the text "${content}" is ${found ? 'found' : 'not found'} on #cta ("Get started")`, async ({
      sdk,
      protocol,
    }) => {
      await start(sdk);
      // Step 2 targets #cta, with the text it must have.
      const session = structuredClone(twoStepFlow('session-2', 'flow-2'));
      session.version.steps[1].target = { type: 'manual', customSelector: '#cta', content };
      await protocol.push('SetFlowSession', session);
      await protocol.push('ForceGoToStep', { sessionId: 'session-2', stepId: 'flow-2-step-2' });
      if (found) {
        await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();
      } else {
        await sdk.advance(4_000);
        await protocol.waitForMessages('ReportTooltipTargetMissing', 1);
      }
    });
  }

  test('a target that appears after the step opens gets the tooltip', async ({ sdk, protocol }) => {
    await start(sdk);
    await showTooltip(protocol, '#late');
    await sdk.advance(1_000);
    await expect(sdk.surface).toHaveCount(0);
    await addButton(sdk.page, 'late', 'Late');
    await sdk.advance(400);
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();
    await sdk.advance(4_000);
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });

  test('a target the page re-renders keeps the tooltip, on the new element', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await showTooltip(protocol);
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();

    await sdk.page.evaluate(() => {
      const old = document.getElementById('cta') as HTMLElement;
      const fresh = old.cloneNode(true) as HTMLElement;
      fresh.style.marginLeft = '320px';
      old.replaceWith(fresh);
    });
    await sdk.advance(400);
    await expect
      .poll(async () => {
        const tip = await sdk.surface.boundingBox();
        const target = await sdk.page.locator('#cta').boundingBox();
        if (!tip || !target) {
          return 'missing';
        }
        return Math.abs(tip.x + tip.width / 2 - (target.x + target.width / 2)) < 2
          ? 'centered on the new element'
          : `off by ${(tip.x + tip.width / 2 - (target.x + target.width / 2)).toFixed(1)}`;
      })
      .toBe('centered on the new element');
  });

  test('an off-screen target is scrolled into view when its step opens', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await sdk.page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.height = '3000px';
      document.body.appendChild(spacer);
    });
    await addButton(sdk.page, 'far', 'Far away');
    await sdk.page.evaluate(() =>
      document.body.appendChild(document.getElementById('far') as Node),
    );
    await showTooltip(protocol, '#far');
    for (let tick = 0; tick < 10; tick++) {
      await sdk.advance(200);
    }
    await expect
      .poll(() =>
        sdk.page.evaluate(() => {
          const rect = (document.getElementById('far') as HTMLElement).getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        }),
      )
      .toBe(true);
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();
  });

  test('clicking the target runs the step’s target actions', async ({ sdk, protocol }) => {
    await start(sdk);
    const session = structuredClone(twoStepFlow('session-1', 'flow-1'));
    session.version.steps[1].target = {
      type: 'manual',
      customSelector: '#cta',
      actions: [dismissFlow()],
    };
    await protocol.push('SetFlowSession', session);
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();

    await sdk.page.click('#cta');
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toMatchObject({
      sessionId: 'session-1',
      endReason: 'action_dismiss',
    });
  });

  test('with the theme set to show a bubble, a target never found shows the step as a bubble and is reported', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await showTooltip(protocol, '#nowhere', useBubble);
    await sdk.advance(4_000);
    await expect(sdk.page.locator('iframe.usertour-widget-bubble__avatar')).toBeVisible();
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();
    // The selector matched nothing: that is what the step's "times not found" counts.
    await protocol.waitForMessages('ReportTooltipTargetMissing', 1);
    expect(protocol.messages('ReportTooltipTargetMissing')[0].message.payload).toEqual({
      sessionId: 'session-1',
      stepId: 'flow-1-step-2',
    });
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });

  test('a step shown as a bubble for its missing target stays a bubble when the session is pushed again', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await showTooltip(protocol, '#nowhere', useBubble);
    await sdk.advance(4_000);
    await expect(sdk.page.locator('iframe.usertour-widget-bubble__avatar')).toBeVisible();

    // The server refreshes the session in place (an attribute changed, say).
    await protocol.push(
      'SetFlowSession',
      twoStepFlow('session-1', 'flow-1', '#nowhere', useBubble),
    );
    await sdk.advance(400);
    await expect(sdk.page.locator('iframe.usertour-widget-bubble__avatar')).toBeVisible();
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });

  test('returning to a tooltip step waits its full time again, not what the last visit left', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await sdk.pauseClock();
    await showTooltip(protocol, '#nowhere');
    await sdk.advance(1_000);
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-1' });
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
    await sdk.advance(500);
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    // 4s since the first visit, 2.5s since this one: the 3s tolerance has not run out.
    await sdk.advance(2_500);
    await sdk.page.waitForTimeout(300);
    expect(protocol.messages('EndContent')).toHaveLength(0);
    await sdk.advance(1_000);
    await protocol.waitForMessages('EndContent', 1);
  });
});

test.describe('step triggers', () => {
  const triggeredFlow = (condition: unknown, wait = 0) =>
    flowSession({
      sessionId: 'session-1',
      contentId: 'flow-1',
      steps: [
        {
          id: 'flow-1-step-1',
          cvid: 'flow-1-cvid-1',
          type: 'modal',
          data: [
            row(paragraph('Welcome aboard')),
            row(button('Next', [gotoStep('flow-1-cvid-2')])),
          ],
          trigger: [
            {
              id: 'trigger-1',
              conditions: [condition],
              actions: [gotoStep('flow-1-cvid-3')],
              wait,
            },
          ],
        },
        {
          id: 'flow-1-step-2',
          cvid: 'flow-1-cvid-2',
          type: 'modal',
          data: [row(paragraph('Step two'))],
        },
        {
          id: 'flow-1-step-3',
          cvid: 'flow-1-cvid-3',
          type: 'modal',
          data: [row(paragraph('Triggered'))],
        },
      ],
    });

  test('fires once its element condition turns true, and moves to another step', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', triggeredFlow(elementPresent('#later')));
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
    await sdk.advance(1_000);
    expect(goToStepIds(protocol)).toEqual([]);

    await addButton(sdk.page, 'later', 'Later');
    await sdk.advance(400);
    await expect(sdk.frame().getByText('Triggered')).toBeVisible();
    expect(goToStepIds(protocol)).toEqual(['flow-1-step-3']);
  });

  test('fires on a page-URL condition after a navigation', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetFlowSession',
      triggeredFlow({
        id: 'url-1',
        type: 'current-page',
        operators: 'and',
        data: { includes: ['*/next.html*'], excludes: [] },
      }),
    );
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
    await sdk.page.evaluate(() => history.pushState({}, '', '/next.html'));
    await sdk.advance(1_000);
    await expect(sdk.frame().getByText('Triggered')).toBeVisible();
  });

  test('a trigger still waiting is cancelled when the step changes', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', triggeredFlow(elementPresent('#cta'), 3));
    await sdk.frame().getByRole('button', { name: 'Next' }).click();
    await expect(sdk.frame().getByText('Step two')).toBeVisible();
    await sdk.advance(4_000);
    await sdk.page.waitForTimeout(200);
    await expect(sdk.frame().getByText('Step two')).toBeVisible();
    expect(goToStepIds(protocol)).toEqual(['flow-1-step-2']);
  });
});

test.describe('actions and buttons', () => {
  test('a flow-start action asks the server to start that flow, at its step', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetFlowSession',
      modalFlow('session-1', 'flow-1', [
        row(button('Take the next tour', [startFlow('flow-2', 'flow-2-cvid-2')])),
      ]),
    );
    await sdk.frame().getByRole('button', { name: 'Take the next tour' }).click();
    await protocol.waitForMessages('StartContent', 1);
    expect(protocol.messages('StartContent')[0].message.payload).toEqual({
      contentId: 'flow-2',
      stepCvid: 'flow-2-cvid-2',
      startReason: 'start_from_action',
    });
  });

  test('a page-navigate action runs after the other actions of the same click', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    // Record whether the flow was still on when the page was asked to navigate.
    await sdk.page.evaluate(() => {
      window.open = (() => {
        window.__usertourRecorded.flowStartedAtNavigate = [
          String(window.usertour?.isStarted('flow-1')),
        ];
        return null;
      }) as typeof window.open;
    });
    await protocol.push(
      'SetFlowSession',
      modalFlow('session-1', 'flow-1', [
        row(button('Go to the docs', [navigate('https://example.com/docs'), dismissFlow()])),
      ]),
    );
    await sdk.frame().getByRole('button', { name: 'Go to the docs' }).click();
    await protocol.waitForMessages('EndContent', 1);
    await expect.poll(() => sdk.recorded('flowStartedAtNavigate')).toEqual(['false']);
  });

  test('button rules follow the page: disabled while an input is empty, hidden while an element is there', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetFlowSession',
      modalFlow('session-1', 'flow-1', [
        row(
          {
            type: 'button',
            data: {
              text: 'Continue',
              type: 'primary',
              actions: [],
              disableButton: true,
              disableButtonConditions: [
                {
                  id: 'email-empty',
                  type: 'text-input',
                  operators: 'and',
                  data: {
                    logic: 'empty',
                    elementData: { type: 'manual', customSelector: '#email', sequence: '1st' },
                  },
                },
              ],
            },
          },
          {
            type: 'button',
            data: {
              text: 'Skip for now',
              type: 'secondary',
              actions: [],
              hideButton: true,
              hideButtonConditions: [elementPresent('#secondary')],
            },
          },
        ),
      ]),
    );
    const next = sdk.frame().getByRole('button', { name: 'Continue' });
    const skip = sdk.frame().getByRole('button', { name: 'Skip for now' });
    await expect(next).toBeDisabled();
    await expect(skip).toHaveCount(0);

    await sdk.page.fill('#email', 'ada@example.com');
    await sdk.advance(400);
    await expect(next).toBeEnabled();

    await sdk.page.evaluate(() => document.getElementById('secondary')?.remove());
    await sdk.advance(400);
    await expect(skip).toBeVisible();
  });
});
