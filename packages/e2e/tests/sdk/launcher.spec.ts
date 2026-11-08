import type { Page } from '@playwright/test';
import { button, dismissLauncher, evaluateJs, inputEmpty, launcherSession, row } from './content';
import { type SdkPage, expect, test } from './fixtures';

/**
 * What a launcher does with what the builder configures: following its
 * target as it comes and goes, starting itself when the server offers it
 * without a session, which element opens it, an action instead of a tooltip,
 * its tooltip's buttons, dismissing itself after the first use, and several
 * launchers on one page.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

const SESSION = 'launcher-session-1';

const launcher = (overrides: Partial<Parameters<typeof launcherSession>[0]> = {}) =>
  launcherSession({
    sessionId: SESSION,
    contentId: 'launcher-1',
    target: '#cta',
    text: 'Start here',
    ...overrides,
  });

const launchers = (sdk: SdkPage) => sdk.page.locator('.usertour-widget-launcher');

const RUN = "window.__usertourRecorded.ran = ['yes']";

const addButton = (page: Page, id: string) =>
  page.evaluate((id) => {
    const element = document.createElement('button');
    element.id = id;
    element.textContent = id;
    document.querySelector('main')?.appendChild(element);
  }, id);

test.describe('its target', () => {
  test('a launcher waits for its target, and hides and returns with it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddLauncher', launcher({ target: '#later' }));
    await sdk.advance(1_000);
    await expect(launchers(sdk)).toHaveCount(0);

    await addButton(sdk.page, 'later');
    await sdk.advance(400);
    await expect(launchers(sdk)).toBeVisible();

    await sdk.page.evaluate(() => {
      (document.getElementById('later') as HTMLElement).style.display = 'none';
    });
    await sdk.advance(400);
    await expect(launchers(sdk)).toHaveCount(0);

    await sdk.page.evaluate(() => {
      (document.getElementById('later') as HTMLElement).style.display = '';
    });
    await sdk.advance(400);
    await expect(launchers(sdk)).toBeVisible();
  });

  test('offered without a session, a launcher whose target is there asks the server to start it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddLauncher', launcher({ sessionId: '' }));
    await protocol.waitForMessages('StartContent', 1);
    expect(protocol.messages('StartContent')[0].message.payload).toEqual({
      contentId: 'launcher-1',
      startReason: 'start_from_condition',
    });
    await sdk.advance(500);
    await expect(launchers(sdk)).toHaveCount(0);

    // The server answers with the session: now it shows.
    await protocol.push('AddLauncher', launcher());
    await expect(launchers(sdk)).toBeVisible();
    await launchers(sdk).click();
    await protocol.waitForMessages('ActivateLauncher', 1);
    expect(protocol.messages('ActivateLauncher')[0].message.payload).toEqual({
      sessionId: SESSION,
    });
  });
});

test.describe('what opens it, and what it does', () => {
  test('set to open from its target, a launcher opens on the target and not on itself', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddLauncher', launcher({ triggerElement: 'target' }));
    await launchers(sdk).click();
    await sdk.advance(300);
    expect(protocol.messages('ActivateLauncher')).toHaveLength(0);
    await expect(sdk.surface).toHaveCount(0);

    await sdk.page.click('#cta');
    await protocol.waitForMessages('ActivateLauncher', 1);
    await expect(sdk.frame().getByText('Start here')).toBeVisible();
  });

  test('set to perform an action, a launcher runs it and opens no tooltip', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddLauncher', launcher({ actions: [evaluateJs(RUN)] }));
    await launchers(sdk).click();
    await protocol.waitForMessages('ActivateLauncher', 1);
    await expect.poll(() => sdk.recorded('ran')).toEqual(['yes']);
    await sdk.advance(300);
    await expect(sdk.surface).toHaveCount(0);
  });
});

test.describe('its tooltip', () => {
  test('a tooltip button runs its actions; a dismiss button ends the launcher with action_dismiss', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'AddLauncher',
      launcher({
        blocks: [row(button('Show me', [evaluateJs(RUN)]), button('Got it', [dismissLauncher()]))],
      }),
    );
    await launchers(sdk).click();
    await sdk.frame().getByRole('button', { name: 'Show me' }).click();
    await expect.poll(() => sdk.recorded('ran')).toEqual(['yes']);

    await sdk.frame().getByRole('button', { name: 'Got it' }).click();
    await protocol.waitForMessages('DismissLauncher', 1);
    expect(protocol.messages('DismissLauncher')[0].message.payload).toEqual({
      sessionId: SESSION,
      endReason: 'action_dismiss',
    });
    await expect(launchers(sdk)).toHaveCount(0);
  });

  test('a tooltip button’s rules follow the page while the tooltip is open', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'AddLauncher',
      launcher({ blocks: [row(button('Continue', [], { disableWhen: [inputEmpty('#email')] }))] }),
    );
    await launchers(sdk).click();
    const next = sdk.frame().getByRole('button', { name: 'Continue' });
    await expect(next).toBeDisabled();

    await sdk.page.fill('#email', 'ada@example.com');
    await sdk.advance(400);
    await expect(next).toBeEnabled();
  });

  test('set to dismiss after its first use, a launcher ends when its tooltip closes', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('AddLauncher', launcher({ dismissAfterFirstActivation: true }));
    await launchers(sdk).click();
    await expect(sdk.frame().getByText('Start here')).toBeVisible();
    expect(protocol.messages('DismissLauncher')).toHaveLength(0);

    await sdk.page.getByRole('heading', { name: 'Runtime host' }).click();
    await protocol.waitForMessages('DismissLauncher', 1);
    expect(protocol.messages('DismissLauncher')[0].message.payload).toEqual({
      sessionId: SESSION,
      endReason: 'launcher_deactivated',
    });
    await expect(launchers(sdk)).toHaveCount(0);
  });
});

test('several launchers show at once; a dismissed one is not added back', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  // The first opens from its target, so it can be told apart from the second.
  const first = launcher({
    triggerElement: 'target',
    blocks: [row(button('Got it', [dismissLauncher()]))],
  });
  await protocol.push('AddLauncher', first);
  await protocol.push(
    'AddLauncher',
    launcherSession({
      sessionId: 'launcher-session-2',
      contentId: 'launcher-2',
      target: '#email',
      text: 'Your email',
    }),
  );
  await expect(launchers(sdk)).toHaveCount(2);

  await sdk.page.click('#cta');
  await sdk.frame().getByRole('button', { name: 'Got it' }).click();
  await protocol.waitForMessages('DismissLauncher', 1);
  await expect(launchers(sdk)).toHaveCount(1);

  await protocol.push('AddLauncher', first);
  await sdk.advance(500);
  await expect(launchers(sdk)).toHaveCount(1);
  expect(await sdk.isStarted('launcher-1')).toBe(false);
  expect(await sdk.isStarted('launcher-2')).toBe(true);
});
