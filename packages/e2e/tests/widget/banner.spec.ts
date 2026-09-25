import { type Gallery, expect, test } from './gallery';

const BANNER = '.usertour-widget-banner';
const FRAME = 'iframe.usertour-widget-banner-frame';

/** Height of the frame's visible area vs. what its document needs. */
const frameFit = async (gallery: Gallery) => {
  await gallery.settledBox(gallery.page.locator(BANNER));
  return gallery.page.locator(FRAME).evaluate((frame: HTMLIFrameElement) => ({
    visible: frame.clientHeight,
    needed: frame.contentDocument?.documentElement.scrollHeight ?? Number.NaN,
  }));
};

test('a top-of-page banner is the first thing on the page and pushes the page down', async ({
  gallery,
  page,
}) => {
  await gallery.open('banner-one-line');
  const banner = await gallery.settledBox(page.locator(BANNER));
  const header = await gallery.settledBox(page.locator('header'));

  expect(await page.evaluate(() => document.body.firstElementChild?.className)).toBe(
    'usertour-widget-banner',
  );
  expect(banner.y).toBe(0);
  expect(Math.abs(header.y - (banner.y + banner.height))).toBeLessThanOrEqual(1);
});

// Guards the "stacked rows clipped to ~32px" report (banner coverage eval,
// 2026-07-17): on a page whose CSS reset removes iframe borders, the frame
// grows to fit every row.
test('a banner with stacked rows grows to show all of them', async ({ gallery }) => {
  await gallery.open('banner-stacked-rows-reset-page');
  const { visible, needed } = await frameFit(gallery);

  expect(needed, 'three rows need more than one line').toBeGreaterThan(64);
  expect(visible).toBeGreaterThanOrEqual(needed);
});

test.describe('on a page without a CSS reset', () => {
  // KNOWN BUG (found 2026-09-25): the banner frame keeps the browser's default
  // 2px iframe border. index.css only resets `#usertour-widget iframe`, and
  // the banner mounts outside #usertour-widget; `.usertour-widget-banner-frame`
  // sets no border. Pages with a global reset (e.g. Tailwind) hide it.
  test.fail();

  test('the banner frame has no border', async ({ gallery, page }) => {
    await gallery.open('banner-one-line');
    await gallery.settledBox(page.locator(BANNER));
    const border = await page
      .locator(FRAME)
      .evaluate((frame) => getComputedStyle(frame).borderTopWidth);
    expect(border).toBe('0px');
  });

  test('a banner with stacked rows shows all of them', async ({ gallery }) => {
    await gallery.open('banner-stacked-rows');
    const { visible, needed } = await frameFit(gallery);
    expect(visible, 'the border eats 4px of the frame').toBeGreaterThanOrEqual(needed);
  });
});
