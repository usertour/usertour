import { defaultSettings } from '@usertour/constants';
import { dismissFlow, flowSession, gotoStep, button, paragraph, row, twoStepFlow } from './content';
import { EMIT_TIMEOUT_MS, expect, test } from './fixtures';

/**
 * A flow's life on the page, from the session the server pushes to what the
 * page reports back: the step rendered, the navigation, the ways it ends,
 * and what the server hears about each.
 */
test.describe('flow sessions', () => {
  const start = async (sdk: {
    init: () => Promise<unknown>;
    identify: (id: string) => Promise<unknown>;
  }) => {
    await sdk.init();
    await sdk.identify('u1');
  };

  test('a pushed session renders its first step and reports nothing until the user acts', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    // Let identify()'s batch close before counting.
    await sdk.advance(100);
    await protocol.waitForBatchesToClose();
    const before = protocol.seen.length;
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));

    await expect(sdk.surface).toBeVisible();
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
    await expect(sdk.frame().getByRole('button', { name: 'Next' })).toBeVisible();
    expect(await sdk.isStarted('flow-1')).toBe(true);
    // Rendering is not reported: the server already knows the session started.
    await sdk.advance(1_000);
    expect(protocol.seen.length).toBe(before);
  });

  test('Next asks the server to go to the step, then shows the tooltip on its target', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await sdk.frame().getByRole('button', { name: 'Next' }).click();

    await protocol.waitForMessages('GoToStep', 1);
    expect(protocol.messages('GoToStep')[0].message.payload).toEqual({
      sessionId: 'session-1',
      stepId: 'flow-1-step-2',
    });
    // The next step renders once the server acknowledged the move.
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await sdk.advance(250);
    await expect(sdk.surface).toHaveAttribute('data-usertour-popper-data-placement', /bottom/);
  });

  test('a step change is held until the server acknowledges it', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    protocol.answer = (message) => (message.kind === 'GoToStep' ? 'silent' : true);
    await sdk.frame().getByRole('button', { name: 'Next' }).click();
    await protocol.waitForMessages('GoToStep', 1);
    await sdk.page.waitForTimeout(200);
    await expect(sdk.frame().getByText('Click here to begin')).toHaveCount(0);

    // The acknowledgement times out; the SDK moves on.
    await sdk.advance(EMIT_TIMEOUT_MS);
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
  });

  test('Done on the last step ends the flow with the action reason', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await sdk.frame().getByRole('button', { name: 'Next' }).click();
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await sdk.frame().getByRole('button', { name: 'Done' }).click();

    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toEqual({
      sessionId: 'session-1',
      endReason: 'action_dismiss',
    });
    await expect(sdk.surface).toHaveCount(0);
    expect(await sdk.isStarted('flow-1')).toBe(false);
  });

  test('the close button ends the flow with the close reason', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await sdk.frame().getByRole('button', { name: 'Close' }).click();
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toEqual({
      sessionId: 'session-1',
      endReason: 'close_button_dismiss',
    });
    await expect(sdk.surface).toHaveCount(0);
  });

  test('a session the server unsets disappears without a report', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await expect(sdk.surface).toBeVisible();
    // Let identify()'s batch close before counting.
    await sdk.advance(100);
    await protocol.waitForBatchesToClose();
    const before = protocol.seen.length;
    await protocol.push('UnsetFlowSession', { sessionId: 'session-1' });
    await expect(sdk.surface).toHaveCount(0);
    expect(await sdk.isStarted('flow-1')).toBe(false);
    await sdk.advance(1_000);
    expect(protocol.seen.length).toBe(before);
  });

  test('a session the user dismissed is not shown again when pushed again', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await sdk.frame().getByRole('button', { name: 'Close' }).click();
    await protocol.waitForMessages('EndContent', 1);

    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await sdk.page.waitForTimeout(200);
    await expect(sdk.surface).toHaveCount(0);
    expect(await sdk.logLines(/Ignoring SetFlowSession for a dismissed session/)).toHaveLength(1);

    // A new session of the same content is a new session.
    await protocol.push('SetFlowSession', twoStepFlow('session-2', 'flow-1'));
    await expect(sdk.surface).toBeVisible();
  });

  test('the server can force a step; the page does not report that move', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await sdk.advance(250);
    expect(protocol.messages('GoToStep')).toHaveLength(0);
  });

  test('a session and a step jump pushed without a receipt are taken, in order', async ({
    sdk,
    protocol,
  }) => {
    // The server pushes without asking for an acknowledgement: the SDK's
    // listener gets no callback and must process the message all the same.
    await start(sdk);
    protocol.pushWithoutReceipt('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    protocol.pushWithoutReceipt('ForceGoToStep', {
      sessionId: 'session-1',
      stepId: 'flow-1-step-2',
    });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    expect(await sdk.isStarted('flow-1')).toBe(true);
  });

  test('a session pushed with a current step opens on that step', async ({ sdk, protocol }) => {
    await start(sdk);
    const session = twoStepFlow('session-1', 'flow-1');
    await protocol.push('SetFlowSession', {
      ...session,
      currentStep: { id: 'flow-1-step-2', cvid: 'flow-1-cvid-2' },
    });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expect(sdk.frame().getByText('Welcome aboard')).toHaveCount(0);
  });

  test('a tooltip whose target never appears is reported and the flow ends', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await sdk.pauseClock();
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#nowhere'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    // The element watcher retries every 200ms until the theme's tolerance (3s).
    await sdk.advance(2_800);
    await sdk.page.waitForTimeout(300);
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
    await sdk.advance(400);
    await protocol.waitForMessages('ReportTooltipTargetMissing', 1);
    expect(protocol.messages('ReportTooltipTargetMissing')[0].message.payload).toEqual({
      sessionId: 'session-1',
      stepId: 'flow-1-step-2',
    });
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toMatchObject({
      endReason: 'tooltip_target_missing',
    });
    expect(await sdk.logLines(/Step target element was not found/)).toHaveLength(1);
  });

  test('a tooltip whose target is scrolled out of the page hides, stays, and comes back', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await sdk.page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.height = '4000px';
      document.body.appendChild(spacer);
    });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#cta'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();

    await sdk.page.evaluate(() => window.scrollTo(0, 2000));
    await sdk.advance(400);
    await expect(sdk.surface).toBeHidden();
    // Well past the theme's tolerance (3s): reading on is not the target going missing.
    await sdk.advance(5_000);
    await sdk.page.waitForTimeout(200);
    expect(protocol.messages('EndContent')).toHaveLength(0);

    await sdk.page.evaluate(() => window.scrollTo(0, 0));
    await sdk.advance(400);
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
  });

  test('a tooltip whose target has a width but no height stays: its children overflow it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    // A container whose children are all out of its flow has no height of its
    // own, yet what it holds is on screen and the tooltip has a line to point at.
    await sdk.page.evaluate(() => {
      const bar = document.createElement('div');
      bar.id = 'toolbar';
      bar.style.cssText = 'position:relative;width:300px;height:0';
      const save = document.createElement('button');
      save.textContent = 'Save';
      save.style.cssText = 'position:absolute;top:0;left:0';
      bar.appendChild(save);
      document.querySelector('main')?.appendChild(bar);
    });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#toolbar'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();

    // Well past the theme's tolerance (3s).
    await sdk.advance(5_000);
    await sdk.page.waitForTimeout(200);
    expect(protocol.messages('EndContent')).toHaveLength(0);
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
  });

  test('a tooltip whose target leaves the page ends the flow at the tolerance, without a missing-target report', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#cta'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();

    await sdk.pauseClock();
    await sdk.page.evaluate(() => document.getElementById('cta')?.remove());
    await sdk.advance(2_800);
    await sdk.page.waitForTimeout(300);
    expect(protocol.messages('EndContent')).toHaveLength(0);

    await sdk.advance(800);
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toMatchObject({
      sessionId: 'session-1',
      endReason: 'tooltip_target_missing',
    });
    // That report counts selectors that find nothing; this one did find its element.
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
    expect(await sdk.logLines(/stayed hidden past the timeout; closing the flow/)).toHaveLength(1);
  });

  test('with the theme set to show a bubble, a tooltip whose target left turns into a bubble', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    const useBubble = {
      ...defaultSettings,
      tooltip: { ...defaultSettings.tooltip, missingTargetBehavior: 'use-bubble' },
    };
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#cta', useBubble));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();

    await sdk.page.evaluate(() => document.getElementById('cta')?.remove());
    await sdk.advance(4_000);
    await expect(sdk.page.locator('iframe.usertour-widget-bubble__avatar')).toBeVisible();
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    expect(protocol.messages('EndContent')).toHaveLength(0);
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  // A tooltip's target is looked up under <body>, a condition's element in
  // the whole document. An element in <head> that the selector also matches
  // comes first in the document and must not become the target.
  test('a tooltip target is never an element in <head>', async ({ sdk, protocol }) => {
    await start(sdk);
    await sdk.page.evaluate(() => {
      const meta = document.createElement('meta');
      meta.name = 'email';
      document.head.append(meta);
    });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '[name="email"]'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await sdk.advance(4_000);
    await expect(sdk.surface).toBeVisible();
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  test('a step trigger dismisses the flow after its wait', async ({ sdk, protocol }) => {
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
            data: [row(paragraph('Going away soon'))],
            trigger: [
              {
                id: 'trigger-1',
                conditions: [
                  {
                    id: 'trigger-cond-1',
                    type: 'element',
                    operators: 'and',
                    data: {
                      logic: 'present',
                      elementData: { type: 'manual', customSelector: '#cta', sequence: '1st' },
                    },
                  },
                ],
                actions: [dismissFlow()],
                wait: 2,
              },
            ],
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText('Going away soon')).toBeVisible();
    await sdk.advance(1_000);
    await expect(sdk.surface).toBeVisible();
    await sdk.advance(2_000);
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toMatchObject({
      endReason: 'trigger_dismiss',
    });
  });

  test('endAll() asks the server to end everything and waits for it', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await expect(sdk.surface).toBeVisible();
    await sdk.call('endAll');
    await protocol.waitForMessages('EndAllContent', 1);
    // Still on screen until the server unsets it.
    await expect(sdk.surface).toBeVisible();
    await protocol.push('UnsetFlowSession', { sessionId: 'session-1' });
    await expect(sdk.surface).toHaveCount(0);
  });

  test('the reconnect handshake names the flow session on screen', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await expect(sdk.surface).toBeVisible();
    protocol.dropTransport();
    await protocol.waitForDisconnect(protocol.connections[0]);
    await sdk.advance(3_000);
    await protocol.waitForConnections(2);
    expect(protocol.connections[1].auth).toMatchObject({ flowSessionId: 'session-1' });
  });

  test('a second session replaces the first without a report', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
    await protocol.push(
      'SetFlowSession',
      flowSession({
        sessionId: 'session-2',
        contentId: 'flow-2',
        steps: [
          {
            id: 'flow-2-step-1',
            cvid: 'flow-2-cvid-1',
            type: 'modal',
            data: [row(paragraph('Another tour')), row(button('Ok', [gotoStep('flow-2-cvid-1')]))],
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText('Another tour')).toBeVisible();
    expect(await sdk.isStarted('flow-1')).toBe(false);
    expect(await sdk.isStarted('flow-2')).toBe(true);
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });
});
