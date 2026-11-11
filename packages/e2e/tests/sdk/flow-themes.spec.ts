import type { Page } from '@playwright/test';
import { defaultSettings } from '@usertour/constants';
import { flowSession, paragraph, row } from './content';
import { type SdkPage, expect, test } from './fixtures';

/**
 * Which theme a flow step is drawn with, and what of it reaches the page:
 * the step's own theme over the version's, the first matching variation, a
 * variation that starts matching while the step is open, the theme's custom
 * CSS and its font. The step's panel background is the theme's
 * `mainColor.background`, so it tells the themes apart.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

const withBackground = (background: string) => ({
  ...defaultSettings,
  mainColor: { ...defaultSettings.mainColor, background },
});

const BLUE = { hex: '#1d4ed8', rgb: 'rgb(29, 78, 216)' };
const GREEN = { hex: '#15803d', rgb: 'rgb(21, 128, 61)' };
const RED = { hex: '#b91c1c', rgb: 'rgb(185, 28, 28)' };
const WHITE = 'rgb(255, 255, 255)';

const elementPresent = (selector: string) => [
  {
    id: `present:${selector}`,
    type: 'element',
    operators: 'and',
    data: {
      logic: 'present',
      elementData: { type: 'manual', customSelector: selector, sequence: '1st' },
    },
  },
];

const oneModal = (theme: unknown, stepTheme?: unknown) =>
  flowSession({
    sessionId: 'session-1',
    contentId: 'flow-1',
    theme,
    steps: [
      {
        id: 'flow-1-step-1',
        cvid: 'flow-1-cvid-1',
        type: 'modal',
        data: [row(paragraph('Themed'))],
        ...(stepTheme ? { theme: stepTheme } : {}),
      },
    ],
  });

const panel = (sdk: SdkPage) => sdk.frame().locator('.usertour-widget-surface-panel');

const addElement = (page: Page, id: string) =>
  page.evaluate((id) => {
    const element = document.createElement('div');
    element.id = id;
    element.textContent = id;
    document.body.appendChild(element);
  }, id);

test('a step’s own theme is used over the version’s', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'SetFlowSession',
    oneModal({ settings: withBackground(BLUE.hex) }, { settings: withBackground(GREEN.hex) }),
  );
  await expect(sdk.frame().getByText('Themed')).toBeVisible();
  await expect(panel(sdk)).toHaveCSS('background-color', GREEN.rgb);
});

test('a flow without a theme ends with store_not_found', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push('SetFlowSession', oneModal(null));
  await protocol.waitForMessages('EndContent', 1);
  expect(protocol.messages('EndContent')[0].message.payload).toEqual({
    sessionId: 'session-1',
    endReason: 'store_not_found',
  });
});

test('the first variation whose conditions match is used', async ({ sdk, protocol }) => {
  await start(sdk);
  await protocol.push(
    'SetFlowSession',
    oneModal({
      settings: withBackground(BLUE.hex),
      variations: [
        { conditions: elementPresent('#nowhere'), settings: withBackground(RED.hex) },
        { conditions: elementPresent('#cta'), settings: withBackground(GREEN.hex) },
        { conditions: elementPresent('#secondary'), settings: withBackground(RED.hex) },
      ],
    }),
  );
  await expect(sdk.frame().getByText('Themed')).toBeVisible();
  await expect(panel(sdk)).toHaveCSS('background-color', GREEN.rgb);
});

test('a variation that starts matching while the step is open recolours it', async ({
  sdk,
  protocol,
  page,
}) => {
  await start(sdk);
  await protocol.push(
    'SetFlowSession',
    oneModal({
      settings: defaultSettings,
      variations: [
        { conditions: elementPresent('#dark-mode'), settings: withBackground(BLUE.hex) },
      ],
    }),
  );
  await expect(sdk.frame().getByText('Themed')).toBeVisible();
  await expect(panel(sdk)).toHaveCSS('background-color', WHITE);

  await addElement(page, 'dark-mode');
  await sdk.advance(400);
  await expect(panel(sdk)).toHaveCSS('background-color', BLUE.rgb);
});

test('the theme’s custom CSS and its Google font are loaded into the step', async ({
  sdk,
  protocol,
}) => {
  await start(sdk);
  await protocol.push(
    'SetFlowSession',
    oneModal({
      settings: {
        ...defaultSettings,
        font: { ...defaultSettings.font, fontFamily: 'Roboto' },
        customCss: '.themed-marker { letter-spacing: 3px; }',
      },
    }),
  );
  await expect(sdk.frame().getByText('Themed')).toBeVisible();
  // Both go into the head of the step's frame.
  await expect
    .poll(() =>
      sdk
        .frame()
        .locator('head')
        .evaluate((head) => ({
          css: [...head.querySelectorAll('style')].some((style) =>
            style.textContent?.includes('.themed-marker'),
          ),
          font: [...head.querySelectorAll('link')].some(
            (link) => link.href.includes('fonts.googleapis.com') && link.href.includes('Roboto'),
          ),
        })),
    )
    .toEqual({ css: true, font: true });
});
