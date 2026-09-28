import {
  bannerSession,
  checklistSession,
  launcherSession,
  resourceCenterSession,
  twoStepFlow,
} from './content';
import { expect, test } from './fixtures';

/**
 * The other content types, from the pushed session to what the page
 * reports: the checklist's expand, task clicks and dismissal; the banner;
 * the launcher on its target; the resource center's panel and blocks.
 */

const start = async (sdk: {
  init: () => Promise<unknown>;
  identify: (id: string) => Promise<unknown>;
}) => {
  await sdk.init();
  await sdk.identify('u1');
};

test.describe('checklist sessions', () => {
  const tasks = [
    { id: 'invite', name: 'Invite your team' },
    { id: 'connect', name: 'Connect a data source' },
  ];

  test('a session pushed to open expanded shows its tasks and reports the expand', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklistSession({ sessionId: 'checklist-session-1', contentId: 'checklist-1', tasks }),
    );
    await expect(
      sdk.frame().getByRole('button', { name: 'Complete task: Invite your team' }),
    ).toBeVisible();
    await protocol.waitForMessages('ShowChecklist', 1);
    expect(protocol.messages('ShowChecklist')[0].message.payload).toEqual({
      sessionId: 'checklist-session-1',
    });
  });

  test('clicking a task reports it; closing and reopening the panel is reported too', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklistSession({ sessionId: 'checklist-session-1', contentId: 'checklist-1', tasks }),
    );
    await sdk.frame().getByRole('button', { name: 'Complete task: Connect a data source' }).click();
    await protocol.waitForMessages('ClickChecklistTask', 1);
    expect(protocol.messages('ClickChecklistTask')[0].message.payload).toEqual({
      sessionId: 'checklist-session-1',
      taskId: 'connect',
    });

    await sdk.frame().getByRole('button', { name: 'Close checklist' }).click();
    await protocol.waitForMessages('HideChecklist', 1);
    const launcher = sdk.page.frameLocator('iframe.usertour-widget-checklist-launcher');
    await expect(launcher.getByRole('button', { name: /Open checklist/ })).toBeVisible();
    await launcher.getByRole('button', { name: /Open checklist/ }).click();
    await protocol.waitForMessages('ShowChecklist', 2);
  });

  test('a completed task is shown as done once the server pushes the session again', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    const session = checklistSession({
      sessionId: 'checklist-session-1',
      contentId: 'checklist-1',
      tasks,
    });
    await protocol.push('SetChecklistSession', session);
    await expect(
      sdk.frame().getByRole('button', { name: 'Complete task: Invite your team' }),
    ).toBeVisible();

    await protocol.push('ChecklistTaskCompleted', {
      sessionId: 'checklist-session-1',
      taskId: 'invite',
    });
    await protocol.push(
      'SetChecklistSession',
      checklistSession({
        sessionId: 'checklist-session-1',
        contentId: 'checklist-1',
        tasks: [{ ...tasks[0], isCompleted: true }, tasks[1]],
      }),
    );
    await sdk.advance(1_500);
    await expect(
      sdk.frame().getByRole('button', { name: 'Uncomplete task: Invite your team' }),
    ).toBeVisible();
  });

  test('dismissing the checklist asks for confirmation and then ends the session', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklistSession({ sessionId: 'checklist-session-1', contentId: 'checklist-1', tasks }),
    );
    await sdk.frame().getByRole('button', { name: 'Dismiss checklist' }).click();
    await sdk.frame().getByRole('button', { name: 'Yes, dismiss' }).click();
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toEqual({
      sessionId: 'checklist-session-1',
      endReason: 'dismiss_button',
    });
    await expect(sdk.page.locator('iframe.usertour-widget-checklist-launcher')).toHaveCount(0);
  });

  test('a flow starting collapses the checklist; the server hears the hide', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklistSession({ sessionId: 'checklist-session-1', contentId: 'checklist-1', tasks }),
    );
    await expect(
      sdk.frame().getByRole('button', { name: 'Complete task: Invite your team' }),
    ).toBeVisible();
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await protocol.waitForMessages('HideChecklist', 1);
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
  });
});

test.describe('banner sessions', () => {
  test('a banner renders at the top of the page and its dismissal ends the session', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetBannerSession',
      bannerSession({
        sessionId: 'banner-session-1',
        contentId: 'banner-1',
        text: 'Maintenance tonight',
      }),
    );
    const banner = sdk.page.frameLocator('iframe.usertour-widget-banner-frame');
    await expect(banner.getByText('Maintenance tonight')).toBeVisible();
    expect(await sdk.isStarted('banner-1')).toBe(true);

    await banner.getByRole('button', { name: 'Dismiss banner' }).click();
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toEqual({
      sessionId: 'banner-session-1',
      endReason: 'dismiss_button',
    });
    await expect(sdk.page.locator('iframe.usertour-widget-banner-frame')).toHaveCount(0);
  });

  test('a banner the server unsets disappears', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetBannerSession',
      bannerSession({
        sessionId: 'banner-session-1',
        contentId: 'banner-1',
        text: 'Maintenance tonight',
      }),
    );
    await expect(sdk.page.locator('iframe.usertour-widget-banner-frame')).toBeVisible();
    await protocol.push('UnsetBannerSession', { sessionId: 'banner-session-1' });
    await expect(sdk.page.locator('iframe.usertour-widget-banner-frame')).toHaveCount(0);
  });
});

test.describe('launchers', () => {
  test('a launcher appears on its target, opens its tooltip on click, and goes away when removed', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'AddLauncher',
      launcherSession({
        sessionId: 'launcher-session-1',
        contentId: 'launcher-1',
        target: '#cta',
        text: 'Start here',
      }),
    );
    const launcher = sdk.page.locator('.usertour-widget-launcher');
    await expect(launcher).toBeVisible();
    await launcher.click();
    await protocol.waitForMessages('ActivateLauncher', 1);
    expect(protocol.messages('ActivateLauncher')[0].message.payload).toEqual({
      sessionId: 'launcher-session-1',
    });
    await expect(sdk.frame().getByText('Start here')).toBeVisible();

    await protocol.push('RemoveLauncher', { contentId: 'launcher-1' });
    await expect(launcher).toHaveCount(0);
  });
});

test.describe('resource center sessions', () => {
  test('the panel opens and closes on the button and reports a clicked block', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetResourceCenterSession',
      resourceCenterSession({
        sessionId: 'rc-session-1',
        contentId: 'rc-1',
        actions: [{ id: 'block-docs', name: 'Read the docs' }],
      }),
    );
    const frame = sdk.page.frameLocator('iframe.usertour-widget-resource-center-frame');
    await frame.getByRole('button', { name: 'Open Help' }).click();
    await protocol.waitForMessages('OpenResourceCenter', 1);
    expect(protocol.messages('OpenResourceCenter')[0].message.payload).toEqual({
      sessionId: 'rc-session-1',
    });
    await expect(frame.getByText('How can we help?')).toBeVisible();

    await frame.getByRole('button', { name: 'Read the docs' }).click();
    await protocol.waitForMessages('ClickResourceCenter', 1);
    expect(protocol.messages('ClickResourceCenter')[0].message.payload).toEqual({
      sessionId: 'rc-session-1',
      blockId: 'block-docs',
    });

    await sdk.advance(500);
    await frame.getByRole('button', { name: 'Open Help' }).click();
    await frame.getByRole('button', { name: 'Close resource center' }).click();
    await protocol.waitForMessages('CloseResourceCenter', 1);
  });

  test('a resource center the server unsets disappears', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetResourceCenterSession',
      resourceCenterSession({ sessionId: 'rc-session-1', contentId: 'rc-1', actions: [] }),
    );
    await expect(sdk.page.locator('iframe.usertour-widget-resource-center-frame')).toBeVisible();
    await protocol.push('UnsetResourceCenterSession', { sessionId: 'rc-session-1' });
    await expect(sdk.page.locator('iframe.usertour-widget-resource-center-frame')).toHaveCount(0);
  });
});

test.describe('the reconnect handshake', () => {
  test('names every session on screen', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklistSession({
        sessionId: 'checklist-session-1',
        contentId: 'checklist-1',
        tasks: [{ id: 'invite', name: 'Invite your team' }],
        expanded: false,
      }),
    );
    await protocol.push(
      'SetBannerSession',
      bannerSession({ sessionId: 'banner-session-1', contentId: 'banner-1', text: 'Hello' }),
    );
    await protocol.push(
      'AddLauncher',
      launcherSession({
        sessionId: 'launcher-session-1',
        contentId: 'launcher-1',
        target: '#cta',
        text: 'Hi',
      }),
    );
    await expect(sdk.page.locator('.usertour-widget-launcher')).toBeVisible();
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await expect(sdk.surface).toBeVisible();

    protocol.dropTransport();
    await protocol.waitForDisconnect(protocol.connections[0]);
    await sdk.advance(3_000);
    await protocol.waitForConnections(2);
    expect(protocol.connections[1].auth).toMatchObject({
      flowSessionId: 'session-1',
      checklistSessionId: 'checklist-session-1',
      bannerSessionId: 'banner-session-1',
      launchers: ['launcher-1'],
    });
  });
});
