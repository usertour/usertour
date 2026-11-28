import type { Locator } from '@playwright/test';
import { button, image, modalFlow, paragraph, row } from './content';
import { expect, test } from './fixtures';

/**
 * A step's content frame scrolls once the step is taller than the room it
 * has. Where a scrollbar takes width (Windows, Linux, macOS with a mouse),
 * that must not change what it has to scroll.
 */

// Headless Chromium gives scrollbars no width at all; this file needs them to
// take some, as they do on a customer's screen.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const height = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (!found) {
    throw new Error('the element has no box');
  }
  return found.height;
};

test('a step just over the cap keeps its scrollbar instead of flickering it', async ({
  sdk,
  protocol,
}) => {
  // A 2:1 image at 100% width: its height follows the width it is given.
  const banner = `data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'/>",
  )}`;
  await sdk.page.setViewportSize({ width: 1280, height: 1200 });
  await sdk.init();
  await sdk.identify('u1');
  await protocol.push(
    'SetFlowSession',
    modalFlow('session-1', 'flow-1', [
      row({ ...image(banner), width: { type: 'percent', value: 100 } }),
      row(paragraph('Banner step')),
      row(button('Next', [])),
    ]),
  );
  await expect(sdk.frame().getByText('Banner step')).toBeVisible();

  // The same width on every platform: macOS would otherwise overlay its scrollbar.
  const html = sdk.frame().locator('html');
  await html.evaluate((root) => {
    const style = root.ownerDocument.createElement('style');
    style.textContent = '::-webkit-scrollbar { width: 15px; }';
    root.ownerDocument.head.appendChild(style);
  });

  // Cap the step 3px under its height, so it has to scroll. Were the content
  // narrowed by the scrollbar, the image would lose 7.5px and fit again — and
  // with no scrollbar, be too tall again.
  const fullHeight = Math.round(await height(sdk.surface));
  await sdk.page.setViewportSize({ width: 1280, height: fullHeight + 32 - 3 });
  await expect.poll(async () => Math.round(await height(sdk.surface))).toBe(fullHeight - 3);

  // Settled: the scrollbar stays on and the frame keeps its height.
  const samples = await html.evaluate(async (root) => {
    const frame = root.ownerDocument.defaultView?.frameElement as HTMLElement | null;
    const seen: string[] = [];
    for (let index = 0; index < 30; index++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      seen.push(`${root.style.overflowY} ${frame?.style.height}`);
    }
    return seen;
  });
  expect(new Set(samples)).toEqual(new Set([samples[0]]));
  expect(samples[0]).toMatch(/^auto /);

  // The scrollbar does take width here, and the last block can still be reached.
  expect(await html.evaluate((root) => root.clientWidth < innerWidth)).toBe(true);
  const next = sdk.frame().getByRole('button', { name: 'Next' });
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport({ ratio: 1 });
});
