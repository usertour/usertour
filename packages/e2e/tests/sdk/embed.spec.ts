import {
  button,
  dismissEmbed,
  embedSession,
  gotoStep,
  oneStepEmbed,
  paragraph,
  row,
} from './content';
import { expect, test } from './fixtures';
import { defaultAnswer } from './protocol-server';

/**
 * Embeds, from the pushed session to what the page reports: a card at its
 * target, several at once, paging between steps, button and dismissal
 * reports, the cover placement, and the sessionless pre-activation.
 */

const FRAME = 'iframe.usertour-widget-embed-frame';
const SHELL = '.usertour-widget-embed';

const start = async (sdk: {
  init: () => Promise<unknown>;
  identify: (id: string) => Promise<unknown>;
}) => {
  await sdk.init();
  await sdk.identify('u1');
};

test('the handshake declares the embed capability', async ({ sdk, protocol }) => {
  await start(sdk);
  expect(protocol.attempts[0].auth.capabilities).toEqual(['embed']);
});

test('an embed renders after its target and its dismissal ends the session', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Upgrade to unlock reports'),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('Upgrade to unlock reports')).toBeVisible();
  expect(await sdk.isStarted('embed-1')).toBe(true);

  // Inserted into the flow right after the target, not floating over it.
  const previous = await sdk.page
    .locator(SHELL)
    .evaluate((shell) => shell.previousElementSibling?.id);
  expect(previous).toBe('panel');

  await frame.getByRole('button', { name: 'Close' }).click();
  await protocol.waitForMessages('EndContent', 1);
  expect(protocol.messages('EndContent')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    endReason: 'dismiss_button',
  });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);
  await expect(sdk.page.locator(SHELL)).toHaveCount(0);
});

test('several embeds show at once, each at its own target', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-1', 'embed-1', '#cta', 'First'));
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-2', 'embed-2', '#panel', 'Second'));
  await expect(sdk.page.locator(FRAME)).toHaveCount(2);
  expect(await sdk.isStarted('embed-1')).toBe(true);
  expect(await sdk.isStarted('embed-2')).toBe(true);

  await protocol.push('RemoveEmbed', { contentId: 'embed-1' });
  await expect(sdk.page.locator(FRAME)).toHaveCount(1);
  expect(await sdk.isStarted('embed-1')).toBe(false);
  expect(await sdk.isStarted('embed-2')).toBe(true);
});

test('a button press is reported with its step and cvid before its actions run', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Upgrade now', [
      button('Not now', [dismissEmbed()], 'button-not-now'),
    ]),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await frame.getByRole('button', { name: 'Not now' }).click();

  await protocol.waitForMessages('ClickButton', 1);
  expect(protocol.messages('ClickButton')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    stepId: 'embed-1-step-1',
    buttonCvid: 'button-not-now',
    buttonText: 'Not now',
  });
  await protocol.waitForMessages('EndContent', 1);
  expect(protocol.messages('EndContent')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    endReason: 'action_dismiss',
  });
  const order = protocol.messages().map((seen) => seen.message.kind);
  expect(order.indexOf('ClickButton')).toBeLessThan(order.indexOf('EndContent'));
});

test.describe('steps', () => {
  const twoSteps = (sessionId: string | undefined, contentId: string, currentCvid?: string) =>
    embedSession({
      sessionId,
      contentId,
      target: '#panel',
      currentCvid,
      steps: [
        {
          id: `${contentId}-step-1`,
          cvid: `${contentId}-cvid-1`,
          type: 'inline',
          name: 'Step 1',
          data: [
            row(paragraph('Step one')),
            row(button('Next', [gotoStep(`${contentId}-cvid-2`)], 'button-next')),
          ],
        },
        {
          id: `${contentId}-step-2`,
          cvid: `${contentId}-cvid-2`,
          type: 'inline',
          name: 'Step 2',
          data: [
            row(paragraph('Step two')),
            row(button('Back', [gotoStep(`${contentId}-cvid-1`)])),
          ],
        },
      ],
    });

  test('a step-goto button pages within the same shell and reports the step', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddEmbed', twoSteps('embed-session-1', 'embed-1'));
    const frame = sdk.page.frameLocator(FRAME);
    await expect(frame.getByText('Step one')).toBeVisible();
    const shellBefore = await sdk.page.locator(SHELL).evaluate((shell) => {
      (shell as HTMLElement).dataset.marker = 'same-shell';
      return true;
    });
    expect(shellBefore).toBe(true);

    await frame.getByRole('button', { name: 'Next' }).click();
    await protocol.waitForMessages('GoToStep', 1);
    expect(protocol.messages('GoToStep')[0].message.payload).toEqual({
      sessionId: 'embed-session-1',
      stepId: 'embed-1-step-2',
    });
    await expect(frame.getByText('Step two')).toBeVisible();
    // The shell stayed in place: no remount, no layout shift between steps.
    await expect(sdk.page.locator(SHELL)).toHaveAttribute('data-marker', 'same-shell');

    await frame.getByRole('button', { name: 'Back' }).click();
    await protocol.waitForMessages('GoToStep', 2);
    expect(protocol.messages('GoToStep')[1].message.payload).toEqual({
      sessionId: 'embed-session-1',
      stepId: 'embed-1-step-1',
    });
    await expect(frame.getByText('Step one')).toBeVisible();
  });

  test('a step change rebuilds the step content instead of patching it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddEmbed', twoSteps('embed-session-1', 'embed-1'));
    const frame = sdk.page.frameLocator(FRAME);
    const nextButton = frame.getByRole('button', { name: 'Next' });
    await expect(nextButton).toBeVisible();
    // Both steps put a button in the same slot. Were its node kept and
    // patched, Back would morph out of Next's colours and inherit its state.
    await nextButton.evaluate((element) => {
      (element as HTMLElement).dataset.marker = 'step-one-button';
    });

    await nextButton.click();
    await expect(frame.getByText('Step two')).toBeVisible();
    const backButton = frame.getByRole('button', { name: 'Back' });
    await expect(backButton).toBeVisible();
    await expect(backButton).not.toHaveAttribute('data-marker', 'step-one-button');
  });

  test('a session opens on its remembered step without reporting it again', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddEmbed', twoSteps('embed-session-1', 'embed-1', 'embed-1-cvid-2'));
    await expect(sdk.page.frameLocator(FRAME).getByText('Step two')).toBeVisible();
    expect(protocol.messages('GoToStep')).toHaveLength(0);
  });

  test('the server can force a step', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('AddEmbed', twoSteps('embed-session-1', 'embed-1'));
    const frame = sdk.page.frameLocator(FRAME);
    await expect(frame.getByText('Step one')).toBeVisible();
    await protocol.push('ForceGoToStep', {
      sessionId: 'embed-session-1',
      stepId: 'embed-1-step-2',
    });
    await expect(frame.getByText('Step two')).toBeVisible();
    expect(protocol.messages('GoToStep')).toHaveLength(0);
  });
});

test('the cover placement sits over the target and tracks its box', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Locked', [], 'cover-element'),
  );
  const shell = sdk.page.locator(SHELL);
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();

  const boxes = async () => {
    const target = await sdk.page.locator('#panel').boundingBox();
    const cover = await shell.boundingBox();
    return { target, cover };
  };
  let { target, cover } = await boxes();
  expect(target && cover).toBeTruthy();
  expect(Math.abs(cover!.x - target!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(cover!.y - target!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(cover!.width - target!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(cover!.height - target!.height)).toBeLessThanOrEqual(1);

  // The cover stands in for the target, so the painted card fills the whole
  // box — not just the content's height, with the target showing underneath.
  const paintedHeight = async () => {
    const painted = await sdk.page.frameLocator(FRAME).locator('body > div').first().boundingBox();
    return painted?.height ?? 0;
  };
  expect(Math.abs((await paintedHeight()) - cover!.height)).toBeLessThanOrEqual(1);
  // The target's DOM is untouched: the cover lives in the body.
  expect(await shell.evaluate((el) => el.parentElement?.tagName)).toBe('BODY');

  // The host lays the page out differently; the cover follows.
  await sdk.page.evaluate(() => {
    const panel = document.getElementById('panel') as HTMLElement;
    panel.style.marginTop = '120px';
    panel.style.height = '160px';
  });
  await expect
    .poll(async () => {
      ({ target, cover } = await boxes());
      return Math.abs(cover!.y - target!.y) <= 1 && Math.abs(cover!.height - target!.height) <= 1;
    })
    .toBe(true);
  await expect.poll(async () => Math.abs((await paintedHeight()) - cover!.height) <= 1).toBe(true);
});

test('the cover places its content at the top, center or bottom of the box', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  // A tall target, so the content has room to sit somewhere in the box.
  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).style.height = '400px';
  });
  const measure = async () => {
    const frame = await sdk.page.locator(FRAME).boundingBox();
    const row = await sdk.page
      .frameLocator(FRAME)
      .locator('body > div > div > *')
      .first()
      .boundingBox();
    return { frame: frame!, row: row! };
  };
  const padding = 16;

  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Locked', [], 'cover-element', 'top'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  let { frame, row } = await measure();
  expect(row.y - frame.y).toBeLessThanOrEqual(padding + 2);
  await protocol.push('RemoveEmbed', { contentId: 'embed-1' });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-2', 'embed-2', '#panel', 'Locked', [], 'cover-element', 'bottom'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  ({ frame, row } = await measure());
  expect(frame.y + frame.height - (row.y + row.height)).toBeLessThanOrEqual(padding + 2);
  await protocol.push('RemoveEmbed', { contentId: 'embed-2' });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  // The default: centered.
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-3', 'embed-3', '#panel', 'Locked', [], 'cover-element'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Locked')).toBeVisible();
  ({ frame, row } = await measure());
  const frameCenter = frame.y + frame.height / 2;
  const rowCenter = row.y + row.height / 2;
  expect(Math.abs(rowCenter - frameCenter)).toBeLessThanOrEqual(2);
});

test('a sessionless embed starts its content once the target is found and renders nothing until then', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push('AddEmbed', oneStepEmbed(undefined, 'embed-1', '#panel', 'Pending'));
  await protocol.waitForMessages('StartContent', 1);
  expect(protocol.messages('StartContent')[0].message.payload).toMatchObject({
    contentId: 'embed-1',
    startReason: 'start_from_condition',
  });
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  // The server records the session and hands it back.
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Pending'));
  await expect(sdk.page.frameLocator(FRAME).getByText('Pending')).toBeVisible();
  expect(await sdk.isStarted('embed-1')).toBe(true);
});

test('a hidden first step routes only once the session exists, and reports where it lands', async ({
  sdk,
  protocol,
}) => {
  // A trigger on a hidden router step: `#panel` is on the page, so it fires
  // as soon as the step's trigger is armed.
  const routed = (sessionId: string | undefined) =>
    embedSession({
      sessionId,
      contentId: 'embed-1',
      target: '#panel',
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'hidden',
          name: 'Router',
          data: [],
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
                    elementData: { type: 'manual', customSelector: '#panel', sequence: '1st' },
                  },
                },
              ],
              actions: [gotoStep('embed-1-cvid-2')],
              wait: 0,
            },
          ],
        },
        {
          id: 'embed-1-step-2',
          cvid: 'embed-1-cvid-2',
          type: 'inline',
          name: 'Routed',
          data: [row(paragraph('Routed'))],
        },
      ],
    });

  await start(sdk);
  await protocol.push('AddEmbed', routed(undefined));
  await protocol.waitForMessages('StartContent', 1);
  // Nothing is active before the session exists, so nothing routes or reports.
  await sdk.advance(500);
  expect(protocol.messages('GoToStep')).toHaveLength(0);

  // The server hands the session back on its first step; the router now runs
  // with a session to report against, and the server learns the landing step.
  await protocol.push('AddEmbed', routed('embed-session-1'));
  await expect(sdk.page.frameLocator(FRAME).getByText('Routed')).toBeVisible();
  await protocol.waitForMessages('GoToStep', 1);
  expect(protocol.messages('GoToStep')[0].message.payload).toEqual({
    sessionId: 'embed-session-1',
    stepId: 'embed-1-step-2',
  });
});

test('a hidden step between two inline steps routes on without unmounting the frame', async ({
  sdk,
  protocol,
}) => {
  // A button sends the user through a hidden router step whose trigger fires
  // at once (`#panel` is on the page) and lands on a third step. The router
  // has no UI, and it must not show that either: the third step renders into
  // the frame the first one rendered into. For a cover, that is what keeps
  // the target covered throughout. The router's own report is held back, so
  // the 200 ms check loop ticks while the router is current but not applied.
  await start(sdk);
  let releaseRouterReport = () => {};
  const routerReport = new Promise<void>((resolve) => {
    releaseRouterReport = resolve;
  });
  protocol.answer = async (message, connection) => {
    if (message.kind === 'GoToStep' && message.payload?.stepId === 'embed-1-step-2') {
      await routerReport;
    }
    return defaultAnswer(message, connection);
  };
  await protocol.push(
    'AddEmbed',
    embedSession({
      sessionId: 'embed-session-1',
      contentId: 'embed-1',
      target: '#panel',
      placement: 'cover-element',
      steps: [
        {
          id: 'embed-1-step-1',
          cvid: 'embed-1-cvid-1',
          type: 'inline',
          name: 'First',
          data: [row(paragraph('First')), row(button('Next', [gotoStep('embed-1-cvid-2')]))],
        },
        {
          id: 'embed-1-step-2',
          cvid: 'embed-1-cvid-2',
          type: 'hidden',
          name: 'Router',
          data: [],
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
                    elementData: { type: 'manual', customSelector: '#panel', sequence: '1st' },
                  },
                },
              ],
              actions: [gotoStep('embed-1-cvid-3')],
              wait: 0,
            },
          ],
        },
        {
          id: 'embed-1-step-3',
          cvid: 'embed-1-cvid-3',
          type: 'inline',
          name: 'Routed',
          data: [row(paragraph('Routed'))],
        },
      ],
    }),
  );
  const frame = sdk.page.frameLocator(FRAME);
  await expect(frame.getByText('First')).toBeVisible();

  // Mark the frame the first step rendered into, and count the mounts that
  // leave the page from here on.
  await sdk.page.evaluate((selector) => {
    const testWindow = window as unknown as { __mountRemovals: number };
    testWindow.__mountRemovals = 0;
    document.querySelector(selector)?.setAttribute('data-test-first-frame', '');
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node instanceof HTMLElement && node.hasAttribute('data-usertour-inline-mount')) {
            testWindow.__mountRemovals += 1;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }, FRAME);

  await frame.getByRole('button', { name: 'Next' }).click();
  // The router is current and unreported; the first step stays on screen
  // through the check loop's ticks.
  await sdk.advance(1000);
  await expect(frame.getByText('First')).toBeVisible();
  releaseRouterReport();
  await expect(frame.getByText('Routed')).toBeVisible();
  await protocol.waitForMessages('GoToStep', 2);
  expect(protocol.messages('GoToStep').map((entry) => entry.message.payload.stepId)).toEqual([
    'embed-1-step-2',
    'embed-1-step-3',
  ]);
  const removals = await sdk.page.evaluate(
    () => (window as unknown as { __mountRemovals: number }).__mountRemovals,
  );
  expect(removals).toBe(0);
  await expect(sdk.page.locator(`${FRAME}[data-test-first-frame]`)).toHaveCount(1);
});

test('several embeds on one target keep their frames and their delivery order', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'First', [], 'top-of-container-element'),
  );
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-2', 'embed-2', '#panel', 'Second', [], 'top-of-container-element'),
  );
  await expect(sdk.page.locator(FRAME)).toHaveCount(2);
  // Each frame measures its content once rendered, and the measurement re-runs
  // the mount effect: that used to move the other shell, reloading its frame
  // while React kept rendering into the old document — two blank cards.
  await sdk.advance(600);
  await expect(sdk.page.frameLocator(FRAME).first().getByText('First')).toBeVisible();
  await expect(sdk.page.frameLocator(FRAME).nth(1).getByText('Second')).toBeVisible();
  // Both sit at the top of the target, in delivery order.
  const order = await sdk.page.evaluate(() => {
    const children = [...(document.getElementById('panel') as HTMLElement).children];
    return children.slice(0, 2).map((child) => child.className);
  });
  expect(order).toEqual(['usertour-widget-embed', 'usertour-widget-embed']);
  const texts = await sdk.page.evaluate(() => {
    return [...document.querySelectorAll('#panel > .usertour-widget-embed iframe')].map((frame) =>
      (frame as HTMLIFrameElement).contentDocument?.body?.innerText.trim(),
    );
  });
  expect(texts).toEqual(['First', 'Second']);
});

test('an embed stays mounted while its target is scrolled out of the viewport', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Here'));
  await expect(sdk.page.locator(FRAME)).toHaveCount(1);

  // Push the target well below the fold and count shell insertions from here:
  // the viewport check used to hide the embed, which reflowed the target back
  // into view, which showed it again, every tick.
  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).style.marginTop = '4000px';
    window.scrollTo(0, 0);
    (window as unknown as { __shellInsertions: number }).__shellInsertions = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && node.classList.contains('usertour-widget-embed')) {
            (window as unknown as { __shellInsertions: number }).__shellInsertions += 1;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await sdk.advance(1000);
  await expect(sdk.page.locator(FRAME)).toHaveCount(1);
  expect(await sdk.isStarted('embed-1')).toBe(true);
  const insertions = await sdk.page.evaluate(
    () => (window as unknown as { __shellInsertions: number }).__shellInsertions,
  );
  expect(insertions).toBe(0);
});

test('an embed survives its target being replaced in place', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'AddEmbed',
    oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Here', [], 'bottom-of-container-element'),
  );
  await expect(sdk.page.frameLocator(FRAME).getByText('Here')).toBeVisible();

  // The host re-renders the card: a new node with the same selector takes the
  // old one's place in the same tick. The watcher finds the new node and the
  // shell is moved into it — which reloads the iframe. The frame must be
  // rebuilt there, not left rendering into the old document.
  await sdk.page.evaluate(() => {
    const oldPanel = document.getElementById('panel') as HTMLElement;
    const newPanel = oldPanel.cloneNode(true) as HTMLElement;
    for (const shell of newPanel.querySelectorAll('.usertour-widget-embed')) {
      shell.remove();
    }
    newPanel.dataset.replaced = 'true';
    oldPanel.replaceWith(newPanel);
  });
  await sdk.advance(600);
  await expect(sdk.page.locator('#panel[data-replaced] > .usertour-widget-embed')).toHaveCount(1);
  await expect(sdk.page.frameLocator(FRAME).getByText('Here')).toBeVisible();
});

test('an embed whose target leaves the page unmounts and comes back with it', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push('AddEmbed', oneStepEmbed('embed-session-1', 'embed-1', '#panel', 'Here'));
  await expect(sdk.page.locator(FRAME)).toBeVisible();

  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).style.display = 'none';
  });
  await sdk.advance(600);
  await expect(sdk.page.locator(FRAME)).toHaveCount(0);

  await sdk.page.evaluate(() => {
    (document.getElementById('panel') as HTMLElement).style.display = '';
  });
  await sdk.advance(600);
  await expect(sdk.page.locator(FRAME)).toBeVisible();
});
