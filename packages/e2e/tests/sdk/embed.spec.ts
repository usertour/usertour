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
