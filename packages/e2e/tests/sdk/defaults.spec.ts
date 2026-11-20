import {
  DEFAULT_BANNER_DATA,
  DEFAULT_CHECKLIST_DATA,
  DEFAULT_LAUNCHER_DATA,
  defaultSettings,
} from '@usertour/constants';
import { createDefaultResourceCenterData, defaultStep } from '@usertour/helpers';
import { PROJECT } from './content';
import { type SdkPage, expect, test } from './fixtures';
import type { ProtocolServer } from './protocol-server';

/**
 * Content as the builder makes it, with the author changing only what it
 * takes to show something: a target picked, some text typed. The rest of the
 * suite builds the content each scenario needs; these start from the
 * builder's own defaults (`defaultStep`, the `DEFAULT_*` data), which most
 * content in the field still carries, so paths only the defaults reach are
 * run too: a tooltip placed automatically, a hidden launcher left on its
 * default trigger element, a banner that animates in.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

/** What the editor saves once the author types into a new text block. */
const typed = (text: string, justifyContent = 'justify-center') => [
  {
    element: { type: 'group' },
    children: [
      {
        element: { type: 'column', width: { type: 'fill' }, justifyContent, style: {} },
        children: [
          { element: { type: 'text', data: [{ type: 'paragraph', children: [{ text }] }] } },
        ],
      },
    ],
  },
];

const session = (type: string, contentId: string, data: Record<string, unknown>) => ({
  id: `${contentId}-session`,
  type,
  draftMode: false,
  attributes: [],
  content: { id: contentId, name: contentId, type, project: PROJECT },
  version: { id: `${contentId}-version`, theme: { settings: defaultSettings }, ...data },
});

const STEP_TEXT = 'Welcome aboard';

/** A new step of `type`, its text typed and, for a tooltip, its target picked. */
const flowWithStep = (type: 'modal' | 'tooltip' | 'bubble' | 'hidden') =>
  session('flow', 'flow-1', {
    steps: [
      {
        ...defaultStep,
        id: 'flow-1-step-1',
        cvid: 'flow-1-cvid-1',
        name: 'Step 1',
        type,
        sequence: 0,
        data: typed(STEP_TEXT),
        target:
          type === 'tooltip'
            ? { ...defaultStep.target, customSelector: '#cta', type: 'manual' }
            : defaultStep.target,
      },
    ],
  });

const closesWithItsButton = async (sdk: SdkPage, protocol: ProtocolServer) => {
  await sdk.frame().getByRole('button', { name: 'Close' }).click();
  await protocol.waitForMessages('EndContent', 1);
  expect(protocol.messages('EndContent')[0].message.payload).toEqual({
    sessionId: 'flow-1-session',
    endReason: 'close_button_dismiss',
  });
  await expect(sdk.surface).toHaveCount(0);
};

test.describe('a flow step made with the defaults', () => {
  test('a modal shows in the middle of the page and closes with its close button', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', flowWithStep('modal'));
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();
    const box = await sdk.surface.boundingBox();
    const width = await sdk.page.evaluate(() => window.innerWidth);
    expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - width / 2)).toBeLessThan(2);

    await closesWithItsButton(sdk, protocol);
  });

  test('a tooltip goes under its target, placed automatically, and closes with its close button', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', flowWithStep('tooltip'));
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();
    const target = await sdk.page.locator('#cta').boundingBox();
    const box = await sdk.surface.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThanOrEqual((target?.y ?? 0) + (target?.height ?? 0));

    await closesWithItsButton(sdk, protocol);
  });

  test('a bubble shows by its avatar and closes with its close button', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', flowWithStep('bubble'));
    await expect(sdk.page.locator('iframe.usertour-widget-bubble__avatar')).toBeVisible();
    await expect(sdk.frame().getByText(STEP_TEXT)).toBeVisible();

    await closesWithItsButton(sdk, protocol);
  });

  test('a hidden step shows nothing and keeps the flow running', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', flowWithStep('hidden'));
    await sdk.advance(5_000);
    await sdk.page.waitForTimeout(200);
    await expect(sdk.surface).toHaveCount(0);
    expect(await sdk.isStarted('flow-1')).toBe(true);
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });
});

test.describe('a launcher made with the defaults', () => {
  const launcherData = (type: 'icon' | 'beacon' | 'button' | 'hidden') => ({
    ...DEFAULT_LAUNCHER_DATA,
    type,
    target: {
      ...DEFAULT_LAUNCHER_DATA.target,
      element: { customSelector: '#cta', type: 'manual' },
    },
    tooltip: { ...DEFAULT_LAUNCHER_DATA.tooltip, content: typed('Start here') },
  });
  const launcher = (sdk: SdkPage) => sdk.page.locator('.usertour-widget-launcher');

  // A hidden launcher has no element to click: its target opens it.
  for (const type of ['icon', 'beacon', 'button', 'hidden'] as const) {
    test(`of type ${type} opens its tooltip on a click and closes it on a click elsewhere`, async ({
      sdk,
      protocol,
    }) => {
      await start(sdk);
      await protocol.push(
        'AddLauncher',
        session('launcher', 'launcher-1', { launcher: launcherData(type) }),
      );
      await expect(launcher(sdk)).toHaveCount(1);
      if (type === 'hidden') {
        await sdk.page.locator('#cta').click();
      } else {
        await expect(launcher(sdk)).toBeVisible();
        await launcher(sdk).click();
      }
      await protocol.waitForMessages('ActivateLauncher', 1);
      await expect(sdk.frame().getByText('Start here')).toBeVisible();

      await sdk.page.getByRole('heading', { name: 'Runtime host' }).click();
      await expect(sdk.surface).toBeHidden();
      expect(protocol.messages('DismissLauncher')).toHaveLength(0);
    });
  }
});

test('a banner made with the defaults shows at the top of the page and the user can dismiss it', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'SetBannerSession',
    session('banner', 'banner-1', {
      banner: { ...DEFAULT_BANNER_DATA, contents: typed('Maintenance tonight') },
    }),
  );
  const banner = sdk.page
    .locator('iframe.usertour-widget-banner-frame')
    .filter({ visible: true })
    .contentFrame();
  await expect(banner.getByText('Maintenance tonight')).toBeVisible();
  const firstInBody = await sdk.page.evaluate(() => {
    const frame = document.querySelector('iframe.usertour-widget-banner-frame');
    return Boolean(frame && document.body.firstElementChild?.contains(frame));
  });
  expect(firstInBody).toBe(true);

  await banner.getByRole('button', { name: 'Dismiss banner' }).click();
  await protocol.waitForMessages('EndContent', 1);
  expect(protocol.messages('EndContent')[0].message.payload).toEqual({
    sessionId: 'banner-1-session',
    endReason: 'dismiss_button',
  });
  await expect(sdk.page.locator('iframe.usertour-widget-banner-frame')).toHaveCount(0);
});

test('a checklist made with the defaults opens with its task, reports a click on it, and can be dismissed', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push('SetChecklistSession', {
    ...session('checklist', 'checklist-1', {
      checklist: {
        ...DEFAULT_CHECKLIST_DATA,
        // The builder's intro template, saved as it is once the author edits anything else.
        content: typed('Write text here', 'justify-start'),
        items: [
          {
            id: 'item-1',
            name: 'New Item',
            description: '',
            clickedActions: [],
            isCompleted: false,
            isVisible: true,
            completeConditions: [],
            onlyShowTask: false,
            onlyShowTaskConditions: [],
          },
        ],
      },
    }),
    // What the server sends for the default initial display, `expanded`.
    expandPending: true,
  });
  const task = sdk.frame().getByRole('button', { name: 'Complete task: New Item' });
  await expect(task).toBeVisible();
  await expect(sdk.frame().getByText('Write text here')).toBeVisible();

  await task.click();
  await protocol.waitForMessages('ClickChecklistTask', 1);

  await sdk.frame().getByRole('button', { name: 'Dismiss checklist' }).click();
  await sdk.frame().getByRole('button', { name: 'Yes, dismiss' }).click();
  await protocol.waitForMessages('EndContent', 1);
  await expect(sdk.page.locator('iframe.usertour-widget-checklist-launcher')).toHaveCount(0);
});

test('a resource center made with the defaults opens on its button to its home tab and closes', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  const data = createDefaultResourceCenterData();
  data.tabs[0].blocks = [
    {
      id: 'block-1',
      type: 'richtext',
      content: typed('How can we help?', 'justify-start'),
      onlyShowBlock: false,
      onlyShowBlockConditions: [],
      // Saved as the editor writes it: no `children` on the text element.
    } as unknown as (typeof data.tabs)[number]['blocks'][number],
  ];
  await protocol.push(
    'SetResourceCenterSession',
    session('resource-center', 'rc-1', { resourceCenter: data }),
  );
  const frame = sdk.page
    .locator('iframe.usertour-widget-resource-center-frame')
    .filter({ visible: true })
    .contentFrame();
  await frame.getByRole('button', { name: 'Open Help' }).click();
  await protocol.waitForMessages('OpenResourceCenter', 1);
  await expect(frame.getByText('How can we help?')).toBeVisible();

  await frame.getByRole('button', { name: 'Close resource center' }).click();
  await protocol.waitForMessages('CloseResourceCenter', 1);
  await expect(frame.getByText('How can we help?')).toBeHidden();
});
