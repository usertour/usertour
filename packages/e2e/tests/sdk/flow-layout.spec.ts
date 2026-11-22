import type { Locator } from '@playwright/test';
import { defaultSettings } from '@usertour/constants';
import {
  type StepInput,
  bannerSession,
  button,
  checklistSession,
  flowSession,
  gotoStep,
  launcherSession,
  linkTemplate,
  modalFlow,
  paragraph,
  resourceCenterSession,
  richText,
  row,
  userAttribute,
} from './content';
import { type SdkPage, expect, test } from './fixtures';

/**
 * How a flow step is laid out and what it shows around its content: where a
 * tooltip goes relative to its target and how far, its width, the progress
 * bar, the branding line, the order the widgets stack in, and the user's
 * attributes in text and links.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

type Box = { x: number; y: number; width: number; height: number };
const box = async (locator: Locator): Promise<Box> => {
  const found = await locator.boundingBox();
  if (!found) {
    throw new Error('the element has no box');
  }
  return found;
};
const bottom = (rect: Box) => rect.y + rect.height;
const right = (rect: Box) => rect.x + rect.width;

/** One tooltip step on `target`, laid out by `setting`. */
const tooltipFlow = (setting: StepInput['setting'], target = '#cta') =>
  flowSession({
    sessionId: 'session-1',
    contentId: 'flow-1',
    steps: [
      {
        id: 'flow-1-step-1',
        cvid: 'flow-1-cvid-1',
        type: 'tooltip',
        target,
        setting,
        data: [row(paragraph('Look here'))],
      },
    ],
  });

test.describe('where a tooltip goes', () => {
  test('side and align put it on that side of its target, aligned to that edge', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', tooltipFlow({ side: 'top', align: 'center' }));
    await expect(sdk.frame().getByText('Look here')).toBeVisible();
    const target = await box(sdk.page.locator('#cta'));
    let surface = await box(sdk.surface);
    expect(bottom(surface)).toBeLessThanOrEqual(target.y + 1);

    await protocol.push('SetFlowSession', tooltipFlow({ side: 'right', align: 'start' }));
    await expect
      .poll(async () => (await box(sdk.surface)).x)
      .toBeGreaterThanOrEqual(right(target) - 1);
    surface = await box(sdk.surface);
    expect(Math.abs(surface.y - target.y)).toBeLessThanOrEqual(1);
  });

  test('alignType auto flips a tooltip that would not fit; fixed keeps the side it was given', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await sdk.page.evaluate(() => {
      const target = document.createElement('button');
      target.id = 'low-target';
      target.textContent = 'At the bottom';
      target.style.cssText = 'position:fixed;left:300px;bottom:0;';
      document.body.appendChild(target);
    });
    const target = await box(sdk.page.locator('#low-target'));

    await protocol.push(
      'SetFlowSession',
      tooltipFlow({ side: 'bottom', align: 'center', alignType: 'auto' }, '#low-target'),
    );
    await expect(sdk.frame().getByText('Look here')).toBeVisible();
    expect(bottom(await box(sdk.surface))).toBeLessThanOrEqual(target.y + 1);

    await protocol.push(
      'SetFlowSession',
      tooltipFlow({ side: 'bottom', align: 'center', alignType: 'fixed' }, '#low-target'),
    );
    await expect
      .poll(async () => (await box(sdk.surface)).y)
      .toBeGreaterThanOrEqual(bottom(target) - 1);
  });

  test('sideOffset and alignOffset move it by that much', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', tooltipFlow({ side: 'bottom', align: 'start' }));
    await expect(sdk.frame().getByText('Look here')).toBeVisible();
    const target = await box(sdk.page.locator('#cta'));
    const before = await box(sdk.surface);

    await protocol.push(
      'SetFlowSession',
      tooltipFlow({ side: 'bottom', align: 'start', sideOffset: 40, alignOffset: 30 }),
    );
    await expect.poll(async () => (await box(sdk.surface)).y).toBeGreaterThan(before.y + 30);
    const after = await box(sdk.surface);
    expect(after.y - before.y).toBeGreaterThanOrEqual(39);
    expect(after.y - before.y).toBeLessThanOrEqual(41);
    expect(after.x - before.x).toBeGreaterThanOrEqual(29);
    expect(after.x - before.x).toBeLessThanOrEqual(31);
    expect(before.y).toBeGreaterThanOrEqual(bottom(target));
  });

  test('a step’s own width is used over the theme’s', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', tooltipFlow({ width: 360 }));
    await expect(sdk.frame().getByText('Look here')).toBeVisible();
    await expect.poll(async () => Math.round((await box(sdk.surface)).width)).toBe(360);

    await protocol.push('SetFlowSession', tooltipFlow({ width: 280 }));
    await expect.poll(async () => Math.round((await box(sdk.surface)).width)).toBe(280);
  });
});

test.describe('around the content', () => {
  test('the progress bar counts the steps when the theme turns it on', async ({
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
          progress: {
            ...defaultSettings.progress,
            enabled: true,
            type: 'numbered',
            position: 'top',
          },
        },
        steps: [
          {
            id: 'flow-1-step-1',
            cvid: 'flow-1-cvid-1',
            type: 'modal',
            data: [row(paragraph('First')), row(button('Next', [gotoStep('flow-1-cvid-2')]))],
          },
          {
            id: 'flow-1-step-2',
            cvid: 'flow-1-cvid-2',
            type: 'modal',
            data: [row(paragraph('Second'))],
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText('1 of 2')).toBeVisible();
    await sdk.frame().getByRole('button', { name: 'Next' }).click();
    await expect(sdk.frame().getByText('2 of 2')).toBeVisible();
  });

  test('the branding line shows unless the project removes it', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', modalFlow('session-1', 'flow-1', [row(paragraph('Hi'))]));
    await expect(sdk.frame().getByText('Made with Usertour')).toBeVisible();

    await protocol.push(
      'SetFlowSession',
      flowSession({
        sessionId: 'session-2',
        contentId: 'flow-2',
        removeBranding: true,
        steps: [
          {
            id: 'flow-2-step-1',
            cvid: 'flow-2-cvid-1',
            type: 'modal',
            data: [row(paragraph('Hi again'))],
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText('Hi again')).toBeVisible();
    await expect(sdk.frame().getByText('Made with Usertour')).toHaveCount(0);
  });

  test('user attributes fill text and link URLs', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetFlowSession',
      flowSession({
        sessionId: 'session-1',
        contentId: 'flow-1',
        attributes: [
          { id: 'attr-first', codeName: 'first_name', bizType: 1, dataType: 2, value: 'Ada' },
        ],
        steps: [
          {
            id: 'flow-1-step-1',
            cvid: 'flow-1-cvid-1',
            type: 'modal',
            data: [
              row(
                richText(
                  { text: 'Hello, ' },
                  userAttribute('first_name', 'there'),
                  { text: '! ' },
                  linkTemplate('Your profile', [
                    { text: 'https://app.example/users/' },
                    userAttribute('first_name', 'guest'),
                  ]),
                ),
              ),
            ],
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText('Hello, Ada!')).toBeVisible();
    await expect(sdk.frame().getByRole('link', { name: 'Your profile' })).toHaveAttribute(
      'href',
      'https://app.example/users/Ada',
    );
  });
});

test('the widgets stack: flow over resource center over checklist over launcher and banner', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'SetBannerSession',
    bannerSession({
      sessionId: 'banner-session-1',
      contentId: 'banner-1',
      text: 'Hello',
      overlay: true,
    }),
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
    'SetResourceCenterSession',
    resourceCenterSession({ sessionId: 'rc-session-1', contentId: 'rc-1', actions: [] }),
  );
  await protocol.push('SetFlowSession', modalFlow('session-1', 'flow-1', [row(paragraph('Hi'))]));
  await expect(sdk.frame().getByText('Hi')).toBeVisible();
  await expect(sdk.page.locator('.usertour-widget-launcher')).toBeVisible();

  const layers = await sdk.page.evaluate(() => {
    const zIndexOf = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? Number(getComputedStyle(element).zIndex) : Number.NaN;
    };
    return {
      flow: zIndexOf('.usertour-widget-surface'),
      resourceCenter: zIndexOf('.usertour-widget-resource-center'),
      checklist: zIndexOf('.usertour-widget-checklist-launcher'),
      launcher: zIndexOf('.usertour-widget-launcher'),
      banner: zIndexOf('.usertour-widget-banner'),
    };
  });
  expect(layers.flow).toBeGreaterThan(layers.resourceCenter);
  expect(layers.resourceCenter).toBeGreaterThan(layers.checklist);
  expect(layers.checklist).toBeGreaterThan(layers.launcher);
  expect(layers.checklist).toBeGreaterThan(layers.banner);
});

test.describe('on a viewport smaller than the step', () => {
  const VIEWPORT = { width: 390, height: 600 };
  // A narrow viewport keeps the side margins only: height is what runs short there.
  const MARGIN_X = 16;
  const MARGIN_Y = 0;
  const longRows = [
    ...Array.from({ length: 40 }, (_, index) => row(paragraph(`Line ${index + 1} of a long step`))),
    row(button('Next', [])),
  ];

  const expectInsideViewport = async (locator: Locator) => {
    await expect
      .poll(async () => {
        const rect = await box(locator);
        return (
          rect.x >= MARGIN_X - 1 &&
          rect.y >= MARGIN_Y - 1 &&
          right(rect) <= VIEWPORT.width - MARGIN_X + 1 &&
          bottom(rect) <= VIEWPORT.height - MARGIN_Y + 1
        );
      })
      .toBe(true);
  };

  test('a modal shrinks to the viewport and its content scrolls inside it', async ({
    sdk,
    protocol,
  }) => {
    await sdk.page.setViewportSize(VIEWPORT);
    await start(sdk);
    await protocol.push('SetFlowSession', modalFlow('session-1', 'flow-1', longRows));
    await expect(sdk.frame().getByText('Line 1 of a long step')).toBeVisible();
    await expectInsideViewport(sdk.surface);

    // The last block is reachable: scrolled to, it lands inside the frame's own viewport.
    const next = sdk.frame().getByRole('button', { name: 'Next' });
    await next.scrollIntoViewIfNeeded();
    const reachable = await next.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const view = element.ownerDocument.defaultView;
      return rect.top >= 0 && rect.bottom <= (view?.innerHeight ?? 0);
    });
    expect(reachable).toBe(true);

    // All the height goes to the content: no margin above or below on a narrow viewport.
    await expect
      .poll(async () => Math.round((await box(sdk.surface)).height))
      .toBe(VIEWPORT.height);

    // Given room again, the step is back to its own width and does not scroll.
    await sdk.page.setViewportSize({ width: 1280, height: 3000 });
    await expect
      .poll(async () => Math.round((await box(sdk.surface)).width))
      .toBe(defaultSettings.modal.width);
    await expect
      .poll(() => next.evaluate((element) => element.ownerDocument.documentElement.style.overflowY))
      .toBe('hidden');
  });

  test('a viewport 800px wide or more keeps the margin above and below too', async ({
    sdk,
    protocol,
  }) => {
    await sdk.page.setViewportSize({ width: 800, height: VIEWPORT.height });
    await start(sdk);
    await protocol.push('SetFlowSession', modalFlow('session-1', 'flow-1', longRows));
    await expect(sdk.frame().getByText('Line 1 of a long step')).toBeVisible();
    await expect
      .poll(async () => {
        const rect = await box(sdk.surface);
        return [Math.round(rect.y), Math.round(bottom(rect))];
      })
      .toEqual([16, VIEWPORT.height - 16]);
  });

  test('a bubble stays on screen, avatar included', async ({ sdk, protocol }) => {
    await sdk.page.setViewportSize(VIEWPORT);
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
            setting: { width: 600 },
            data: longRows,
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText('Line 1 of a long step')).toBeVisible();
    await expectInsideViewport(sdk.surface);
  });

  const oneStep = (
    type: StepInput['type'],
    setting: StepInput['setting'],
    extra: { target?: string; themeSettings?: unknown } = {},
  ) =>
    flowSession({
      sessionId: 'session-1',
      contentId: 'flow-1',
      themeSettings: extra.themeSettings,
      steps: [
        {
          id: 'flow-1-step-1',
          cvid: 'flow-1-cvid-1',
          type,
          target: extra.target,
          setting,
          data: longRows,
        },
      ],
    });

  /** Where the step's last block ends on the page once its frame is scrolled to the end. */
  const lastBlockBottom = async (sdk: SdkPage) => {
    const frame = await box(
      sdk.page.locator('iframe.usertour-widget-surface-viewport').filter({ visible: true }),
    );
    const next = sdk.frame().getByRole('button', { name: 'Next' });
    await next.scrollIntoViewIfNeeded();
    return frame.y + (await next.evaluate((element) => element.getBoundingClientRect().bottom));
  };

  test('a tooltip on a target mid-screen only takes the room left beside it', async ({
    sdk,
    protocol,
  }) => {
    await sdk.page.setViewportSize(VIEWPORT);
    await start(sdk);
    await sdk.page.evaluate(() => {
      const target = document.createElement('button');
      target.id = 'mid-target';
      target.textContent = 'In the middle';
      target.style.cssText = 'position:fixed;left:150px;top:280px;';
      document.body.appendChild(target);
    });
    for (const alignType of ['auto', 'fixed']) {
      await protocol.push(
        'SetFlowSession',
        oneStep(
          'tooltip',
          { side: 'bottom', align: 'center', alignType },
          { target: '#mid-target' },
        ),
      );
      await expect(sdk.frame().getByText('Line 1 of a long step')).toBeVisible();
      await expect
        .poll(async () => bottom(await box(sdk.surface)))
        .toBeLessThanOrEqual(VIEWPORT.height - MARGIN_Y + 1);
      expect(await lastBlockBottom(sdk)).toBeLessThanOrEqual(VIEWPORT.height);
    }
  });

  test('a modal moved off-center by its offset still fits', async ({ sdk, protocol }) => {
    await sdk.page.setViewportSize(VIEWPORT);
    await start(sdk);
    const settings = [
      { position: 'centerBottom', positionOffsetX: 80, positionOffsetY: 20 },
      { position: 'centerTop', positionOffsetX: -80, positionOffsetY: 20 },
      { position: 'leftCenter', positionOffsetX: 20, positionOffsetY: 80 },
      { position: 'rightCenter', positionOffsetX: 20, positionOffsetY: -80 },
    ];
    for (const setting of settings) {
      await protocol.push('SetFlowSession', oneStep('modal', setting));
      await expect(sdk.frame().getByText('Line 1 of a long step')).toBeVisible();
      await expectInsideViewport(sdk.surface);
    }
  });

  test('an offset the viewport has no room for is cut back, not taken out of the step', async ({
    sdk,
    protocol,
  }) => {
    await sdk.page.setViewportSize(VIEWPORT);
    await start(sdk);
    const settings = [
      { position: 'centerBottom', positionOffsetX: 185, positionOffsetY: 20 },
      { position: 'centerTop', positionOffsetX: -400, positionOffsetY: 20 },
      { position: 'leftCenter', positionOffsetX: 20, positionOffsetY: 290 },
      { position: 'rightBottom', positionOffsetX: 300, positionOffsetY: 500 },
    ];
    for (const setting of settings) {
      await protocol.push('SetFlowSession', oneStep('modal', setting));
      await expect(sdk.frame().getByText('Line 1 of a long step')).toBeVisible();
      await expectInsideViewport(sdk.surface);
      const rect = await box(sdk.surface);
      expect(rect.width).toBeGreaterThanOrEqual(240);
      expect(rect.height).toBeGreaterThanOrEqual(120);
    }
  });

  test('an offset past the edge a modal is anchored to is dropped, so all of it can be reached', async ({
    sdk,
    protocol,
  }) => {
    await sdk.page.setViewportSize(VIEWPORT);
    await start(sdk);
    const onScreen = (rect: Box) =>
      rect.x >= 0 &&
      rect.y >= 0 &&
      right(rect) <= VIEWPORT.width &&
      bottom(rect) <= VIEWPORT.height;
    const settings = [
      { position: 'leftTop', positionOffsetX: -400, positionOffsetY: 20, width: 120 },
      { position: 'rightBottom', positionOffsetX: 20, positionOffsetY: -700 },
      { position: 'leftTop', positionOffsetX: 20, positionOffsetY: -700 },
    ];
    for (const setting of settings) {
      await protocol.push('SetFlowSession', oneStep('modal', setting));
      const first = sdk.frame().getByText('Line 1 of a long step');
      const next = sdk.frame().getByRole('button', { name: 'Next' });
      await expect(first).toBeAttached();
      await expect.poll(async () => onScreen(await box(sdk.surface))).toBe(true);
      // Both ends of the content are on screen once scrolled to.
      await first.scrollIntoViewIfNeeded();
      expect(onScreen(await box(first))).toBe(true);
      await next.scrollIntoViewIfNeeded();
      expect(onScreen(await box(next))).toBe(true);
    }
  });

  test('a tooltip with no room on either side of its target moves back over it', async ({
    sdk,
    protocol,
  }) => {
    await sdk.page.setViewportSize(VIEWPORT);
    await start(sdk);
    await sdk.page.evaluate(() => {
      const target = document.createElement('div');
      target.id = 'tall-target';
      target.style.cssText = 'position:fixed;left:20px;top:40px;width:350px;height:520px;';
      document.body.appendChild(target);
    });
    await protocol.push(
      'SetFlowSession',
      oneStep(
        'tooltip',
        { side: 'bottom', align: 'center', alignType: 'auto' },
        { target: '#tall-target' },
      ),
    );
    await expect(sdk.frame().getByText('Line 1 of a long step')).toBeVisible();
    await expectInsideViewport(sdk.surface);
    expect(await lastBlockBottom(sdk)).toBeLessThanOrEqual(VIEWPORT.height);
  });

  test('a thick theme border comes out of the height, not off the screen', async ({
    sdk,
    protocol,
  }) => {
    await sdk.page.setViewportSize(VIEWPORT);
    await start(sdk);
    const themeSettings = {
      ...defaultSettings,
      border: { ...defaultSettings.border, borderWidth: 50, borderWidthEnabled: true },
    };
    await protocol.push(
      'SetFlowSession',
      oneStep(
        'modal',
        { position: 'rightBottom', positionOffsetX: 20, positionOffsetY: 20 },
        { themeSettings },
      ),
    );
    await expect(sdk.frame().getByText('Line 1 of a long step')).toBeVisible();
    await expectInsideViewport(sdk.surface);
  });
});
