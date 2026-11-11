import type { Frame } from '@playwright/test';
import { button, modalFlow, navigate, paragraph, row } from './content';
import { SDK_BUNDLE_URL, expect, test } from './fixtures';

/**
 * The SDK loaded by an app that itself runs inside a frame of another page.
 * What it does must stay inside that frame: its widgets do, and so must a
 * page-navigate action, which is the app's own URL.
 */

/** Mount the embedded app in the host page and wait for its SDK to be ready. */
const mountApp = async (sdk: { page: import('@playwright/test').Page }): Promise<Frame> => {
  await sdk.page.evaluate(
    (src) =>
      new Promise<void>((resolveLoad) => {
        const element = document.createElement('iframe');
        element.id = 'app';
        element.src = src;
        element.style.cssText = 'position:absolute;left:40px;top:120px;width:640px;height:480px';
        element.addEventListener('load', () => resolveLoad(), { once: true });
        document.body.appendChild(element);
      }),
    `/frame-app.html?bundle=${encodeURIComponent(SDK_BUNDLE_URL)}`,
  );
  const frame = sdk.page.frame({ url: /frame-app\.html/ });
  if (!frame) {
    throw new Error('the embedded app frame is missing');
  }
  await expect
    .poll(() => frame.evaluate(() => Boolean(window.usertour && !window.usertour._stubbed)))
    .toBe(true);
  return frame;
};

const stubOpen = (where: { evaluate: Frame['evaluate'] }) =>
  where.evaluate(() => {
    window.__usertourOpened = [];
    window.open = ((url?: string | URL, target?: string) => {
      window.__usertourOpened.push({ url: String(url), target });
      return null;
    }) as typeof window.open;
  });

test('a page-navigate action from an SDK running in a frame navigates that frame, not the page around it', async ({
  sdk,
  protocol,
}) => {
  const app = await mountApp(sdk);
  await stubOpen(sdk.page);
  await stubOpen(app);
  await app.evaluate(async () => {
    await window.usertour?.init('env-token');
    await window.usertour?.identify('u1');
  });
  await protocol.waitForConnections(1);

  await protocol.push(
    'SetFlowSession',
    modalFlow('session-1', 'flow-1', [
      row(paragraph('Welcome to the embedded app')),
      row(button('Go to settings', [navigate('/settings')])),
    ]),
  );
  const widget = app.frameLocator('iframe.usertour-widget-surface-viewport');
  await widget.getByRole('button', { name: 'Go to settings' }).click();

  await expect
    .poll(() => app.evaluate(() => window.__usertourOpened))
    .toEqual([{ url: '/settings', target: '_self' }]);
  expect(await sdk.page.evaluate(() => window.__usertourOpened)).toEqual([]);
});
