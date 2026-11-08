import {
  type TaskInput,
  button,
  checklistSession,
  dismissChecklist,
  elementPresent,
  evaluateJs,
  inputEmpty,
  paragraph,
  row,
} from './content';
import { type SdkPage, expect, test } from './fixtures';

/**
 * What a checklist does with what the builder configures: when it opens
 * expanded, what a task click does, which tasks it lists and lets the user
 * complete, its progress, how it can be dismissed, its own buttons, and a
 * session pushed again after a dismissal or replaced by another.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

const SESSION = 'checklist-session-1';
const TASKS: TaskInput[] = [
  { id: 'invite', name: 'Invite your team' },
  { id: 'connect', name: 'Connect a data source' },
];

const checklist = (overrides: Partial<Parameters<typeof checklistSession>[0]> = {}) =>
  checklistSession({ sessionId: SESSION, contentId: 'checklist-1', tasks: TASKS, ...overrides });

const task = (sdk: SdkPage, name: string, done = false) =>
  sdk.frame().getByRole('button', { name: `${done ? 'Uncomplete' : 'Complete'} task: ${name}` });

const launcherButton = (sdk: SdkPage) =>
  sdk.page
    .frameLocator('iframe.usertour-widget-checklist-launcher')
    .getByRole('button', { name: /Open checklist/ });

/** The server marks a task done: the completion, then the session with it. */
const completeTask = async (
  protocol: { push: (kind: string, payload: unknown) => Promise<unknown> },
  taskId: string,
  session: unknown,
) => {
  await protocol.push('ChecklistTaskCompleted', { sessionId: SESSION, taskId });
  await protocol.push('SetChecklistSession', session);
};

const RUN = "window.__usertourRecorded.ran = ['yes']";

test.describe('opening', () => {
  test('a session the server does not ask to expand opens collapsed, its launcher counting the tasks left', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetChecklistSession', checklist({ expanded: false }));
    await expect(launcherButton(sdk)).toHaveAccessibleName('Open checklist (2 items)');
    await sdk.advance(500);
    await expect(task(sdk, 'Invite your team')).toBeHidden();
    expect(protocol.messages('ShowChecklist')).toHaveLength(0);
  });

  test('a task the server completes expands a collapsed checklist to show it done', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetChecklistSession', checklist({ expanded: false }));
    await expect(launcherButton(sdk)).toBeVisible();

    await completeTask(
      protocol,
      'invite',
      checklist({ expanded: false, tasks: [{ ...TASKS[0], isCompleted: true }, TASKS[1]] }),
    );
    await sdk.advance(1_500);
    await expect(task(sdk, 'Invite your team', true)).toBeVisible();
    await protocol.waitForMessages('ShowChecklist', 1);
    expect(protocol.messages('ShowChecklist')[0].message.payload).toEqual({ sessionId: SESSION });
  });
});

test.describe('task clicks', () => {
  test('a task with actions collapses the checklist and runs them', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklist({ tasks: [{ ...TASKS[0], clickedActions: [evaluateJs(RUN)] }, TASKS[1]] }),
    );
    await task(sdk, 'Invite your team').click();
    await protocol.waitForMessages('ClickChecklistTask', 1);
    await protocol.waitForMessages('HideChecklist', 1);
    await expect(task(sdk, 'Invite your team')).toBeHidden();
    expect(await sdk.recorded('ran')).toEqual(['yes']);
  });

  test('a task completed by its own click keeps the checklist open while its actions run', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    const completedByClick = {
      ...TASKS[0],
      clickedActions: [evaluateJs(RUN)],
      completeConditions: [{ id: 'clicked', type: 'task-is-clicked', operators: 'and', data: {} }],
    };
    await protocol.push('SetChecklistSession', checklist({ tasks: [completedByClick, TASKS[1]] }));
    await task(sdk, 'Invite your team').click();
    await protocol.waitForMessages('ClickChecklistTask', 1);
    await expect.poll(() => sdk.recorded('ran')).toEqual(['yes']);
    await sdk.advance(500);
    expect(protocol.messages('HideChecklist')).toHaveLength(0);
    await expect(task(sdk, 'Invite your team')).toBeVisible();
  });
});

test.describe('the tasks listed', () => {
  const PROFILE: TaskInput = { id: 'profile', name: 'Complete your profile', isCompleted: true };
  const BILLING: TaskInput = { id: 'billing', name: 'Add billing details', isVisible: false };

  test('a hidden task is not listed and counts towards neither the progress nor the launcher', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetChecklistSession', checklist({ tasks: [PROFILE, BILLING, ...TASKS] }));
    await expect(task(sdk, 'Complete your profile', true)).toBeVisible();
    await expect(sdk.frame().getByText('Add billing details')).toHaveCount(0);
    // One of the three tasks this user sees is done.
    await expect(sdk.frame().getByText('33%', { exact: true })).toBeVisible();

    await sdk.frame().getByRole('button', { name: 'Close checklist' }).click();
    await expect(launcherButton(sdk)).toHaveAccessibleName('Open checklist (2 items)');
  });

  test('in order, a task waits for the tasks before it the user can see', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklist({ completionOrder: 'ordered', tasks: [PROFILE, BILLING, ...TASKS] }),
    );
    // The hidden task before it does not hold it back: the user could never do it.
    await expect(task(sdk, 'Invite your team')).toBeEnabled();
    await expect(task(sdk, 'Connect a data source')).toBeDisabled();

    await completeTask(
      protocol,
      'invite',
      checklist({
        completionOrder: 'ordered',
        tasks: [PROFILE, BILLING, { ...TASKS[0], isCompleted: true }, TASKS[1]],
      }),
    );
    await sdk.advance(1_500);
    await expect(task(sdk, 'Connect a data source')).toBeEnabled();
  });
});

test.describe('dismissing', () => {
  test('with dismissal prevented, there is no dismiss link', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetChecklistSession', checklist({ preventDismiss: true }));
    await expect(task(sdk, 'Invite your team')).toBeVisible();
    await expect(sdk.frame().getByRole('button', { name: 'Dismiss checklist' })).toHaveCount(0);
  });

  test('set to dismiss itself, the checklist ends five seconds after its last task is done', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await sdk.pauseClock();
    await protocol.push('SetChecklistSession', checklist({ autoDismiss: true, tasks: [TASKS[0]] }));
    await expect(task(sdk, 'Invite your team')).toBeVisible();

    await completeTask(
      protocol,
      'invite',
      checklist({ autoDismiss: true, tasks: [{ ...TASKS[0], isCompleted: true }] }),
    );
    await expect(task(sdk, 'Invite your team', true)).toBeVisible();
    await sdk.advance(4_800);
    await sdk.page.waitForTimeout(200);
    expect(protocol.messages('EndContent')).toHaveLength(0);

    await sdk.advance(400);
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toEqual({
      sessionId: SESSION,
      endReason: 'auto_dismissed',
    });
    await expect(sdk.page.locator('iframe.usertour-widget-checklist-launcher')).toHaveCount(0);
  });
});

test.describe('the checklist’s own buttons', () => {
  test('run their actions and follow their rules as the page changes', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklist({
        content: [
          row(paragraph('Get set up in three steps.')),
          row(
            button('Watch the video', [evaluateJs(RUN)]),
            button('Continue', [], { disableWhen: [inputEmpty('#email')] }),
            button('Skip for now', [], { hideWhen: [elementPresent('#secondary')] }),
          ),
        ],
      }),
    );
    const next = sdk.frame().getByRole('button', { name: 'Continue' });
    const skip = sdk.frame().getByRole('button', { name: 'Skip for now' });
    await expect(next).toBeDisabled();
    await expect(skip).toHaveCount(0);

    await sdk.frame().getByRole('button', { name: 'Watch the video' }).click();
    await expect.poll(() => sdk.recorded('ran')).toEqual(['yes']);

    await sdk.page.fill('#email', 'ada@example.com');
    await sdk.advance(400);
    await expect(next).toBeEnabled();
    await sdk.page.evaluate(() => document.getElementById('secondary')?.remove());
    await sdk.advance(400);
    await expect(skip).toBeVisible();
  });

  test('a dismiss action ends the checklist with action_dismiss', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetChecklistSession',
      checklist({
        content: [row(paragraph('Not for you?')), row(button('No thanks', [dismissChecklist()]))],
      }),
    );
    await sdk.frame().getByRole('button', { name: 'No thanks' }).click();
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toEqual({
      sessionId: SESSION,
      endReason: 'action_dismiss',
    });
    await expect(sdk.page.locator('iframe.usertour-widget-checklist-launcher')).toHaveCount(0);
  });
});

test.describe('sessions', () => {
  test('a dismissed session the server pushes again stays gone', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetChecklistSession', checklist());
    await sdk.frame().getByRole('button', { name: 'Dismiss checklist' }).click();
    await sdk.frame().getByRole('button', { name: 'Yes, dismiss' }).click();
    await protocol.waitForMessages('EndContent', 1);
    await expect(sdk.page.locator('iframe.usertour-widget-checklist-launcher')).toHaveCount(0);

    await protocol.push('SetChecklistSession', checklist());
    await sdk.advance(500);
    await expect(sdk.page.locator('iframe.usertour-widget-checklist-launcher')).toHaveCount(0);
    expect(protocol.messages('ShowChecklist')).toHaveLength(1);
  });

  test('another session replaces the one on screen', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetChecklistSession', checklist());
    await expect(task(sdk, 'Invite your team')).toBeVisible();

    await protocol.push(
      'SetChecklistSession',
      checklistSession({
        sessionId: 'checklist-session-2',
        contentId: 'checklist-2',
        tasks: [{ id: 'tour', name: 'Take the product tour' }],
      }),
    );
    await expect(task(sdk, 'Take the product tour')).toBeVisible();
    await expect(task(sdk, 'Invite your team')).toHaveCount(0);
    expect(await sdk.isStarted('checklist-1')).toBe(false);
    expect(await sdk.isStarted('checklist-2')).toBe(true);
  });
});

test.describe('locale and reload', () => {
  test('the built-in strings follow the session’s locale', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetChecklistSession', checklist({ userLocale: 'zh-Hans' }));
    // The task's accessible name, the dismiss link and the close button, all in Simplified Chinese.
    await expect(
      sdk.frame().getByRole('button', { name: '标记为完成: Invite your team' }),
    ).toBeVisible();
    await expect(sdk.frame().getByRole('button', { name: '关闭清单' })).toBeVisible();
    await expect(sdk.frame().getByRole('button', { name: '收起清单' })).toBeVisible();
  });

  test('a checklist left expanded is expanded again after the page reloads', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetChecklistSession', checklist());
    await expect(task(sdk, 'Invite your team')).toBeVisible();

    await sdk.reload();
    await start(sdk);
    await protocol.waitForConnections(2);
    // The server does not ask to expand this time; the page remembers it was.
    await protocol.push('SetChecklistSession', checklist({ expanded: false }));
    await expect(task(sdk, 'Invite your team')).toBeVisible();
  });
});
