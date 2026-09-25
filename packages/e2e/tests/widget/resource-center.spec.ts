import { expect, test } from './gallery';

const FRAME = 'iframe.usertour-widget-resource-center-frame';

test('the resource center opens from its launcher', async ({ gallery, page }) => {
  await gallery.open('resource-center-collapsed');
  await gallery.settledBox(page.locator(FRAME));

  await page.frameLocator(FRAME).getByRole('button', { name: 'Open Help' }).click();

  expect(await gallery.calls()).toContainEqual({ method: 'resourceCenter.expand', args: [true] });
  await expect(
    page.locator(`${FRAME}.usertour-widget-resource-center-frame--expanded`),
  ).toBeVisible();
  await expect(
    page.frameLocator(FRAME).getByRole('button', { name: 'Documentation' }),
  ).toBeVisible();
});

test('switching tabs shows the other tab', async ({ gallery, page }) => {
  await gallery.open('resource-center-expanded');
  await gallery.settledBox(page.locator(FRAME));
  const panel = page.frameLocator(FRAME);

  await panel.getByRole('button', { name: 'Help', exact: true }).click();

  await expect(panel.getByText('Write to support@example.com')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Documentation' })).toBeHidden();
});

// Guards ed42b4efb: the unread badge also showed on the tab you were already on.
test('the unread badge sits on the news tab until you are on it', async ({ gallery, page }) => {
  await gallery.open('resource-center-news');
  await gallery.settledBox(page.locator(FRAME));
  const panel = page.frameLocator(FRAME);
  const newsTab = panel.getByRole('button', { name: /News/ });

  await expect(newsTab).toHaveText(/3/);

  await newsTab.click();
  await expect(newsTab).toHaveText('News');
  await expect(panel.getByRole('button', { name: /What's new/ })).toContainText('3');
});

// Guards 95caa17c2: the first tab always showed a fixed "Home" label and icon.
test('the first tab shows its own name and icon', async ({ gallery, page }) => {
  await gallery.open('resource-center-renamed-home');
  await gallery.settledBox(page.locator(FRAME));
  const panel = page.frameLocator(FRAME);

  const firstTab = panel.getByRole('button', { name: 'Start here' });
  await expect(firstTab).toBeVisible();
  await expect(firstTab.locator('img')).toHaveAttribute('src', '/fixtures/photo.png');
  await expect(panel.getByRole('button', { name: 'Home', exact: true })).toHaveCount(0);
});

// Guards 766fe8c33: body content could paint over (and take clicks from) the
// tab bar and footer.
test('with the body scrolled to the end, the tab bar and footer stay on top', async ({
  gallery,
  page,
}) => {
  await gallery.open('resource-center-long-home');
  await gallery.settledBox(page.locator(FRAME));

  const onTop = await page.locator(FRAME).evaluate((frame: HTMLIFrameElement) => {
    const doc = frame.contentDocument as Document;
    const scroller = [...doc.querySelectorAll<HTMLElement>('*')].find(
      (el) => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight,
    );
    if (!scroller) {
      throw new Error('the long home tab did not scroll');
    }
    scroller.scrollTop = scroller.scrollHeight;
    const hits = (el: Element | undefined) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return el.contains(doc.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    };
    const buttons = [...doc.querySelectorAll('button')];
    return {
      tab: hits(buttons.find((b) => b.textContent?.trim() === 'Help')),
      footer: hits(doc.querySelector('a[href*="made-with-usertour"]') ?? undefined),
    };
  });

  expect(onTop).toEqual({ tab: true, footer: true });
});

test('a sub-page opens from its row and Back returns to the tab', async ({ gallery, page }) => {
  await gallery.open('resource-center-sub-pages');
  await gallery.settledBox(page.locator(FRAME));
  const panel = page.frameLocator(FRAME);

  await panel.getByRole('button', { name: 'Getting started' }).click();

  await expect(panel.getByText('Step one: connect your data source.')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Back' })).toBeVisible();
  await expect(
    panel.getByRole('button', { name: 'Help', exact: true }),
    'tab bar hidden',
  ).toHaveCount(0);
  expect(await gallery.calls()).toContainEqual({
    method: 'resourceCenter.handleBlockClick',
    args: ['getting-started'],
  });

  await panel.getByRole('button', { name: 'Back' }).click();
  await expect(panel.getByRole('button', { name: 'FAQ' })).toBeVisible();
});

// Guards ebce52dd4: the bubble was pinned to the bottom corners, so with the
// launcher at the top it sat far away with its tail pointing the wrong way.
test.describe('a popup announcement sits by its launcher, tail pointing at it', () => {
  for (const placement of ['bottom-right', 'bottom-left', 'top-right', 'top-left']) {
    test(placement, async ({ gallery, page }) => {
      await gallery.open(`resource-center-popup&placement=${placement}`);
      const launcher = await gallery.settledBox(page.locator(FRAME));
      const bubble = await gallery.settledBox(page.locator('.usertour-widget-announcement-bubble'));
      const tailLocator = page
        .locator(
          '.usertour-widget-announcement-bubble > .usertour-widget-surface-shell > div[aria-hidden="true"]',
        )
        .first();
      const tail = await gallery.settledBox(tailLocator);
      const [vertical, horizontal] = placement.split('-');

      if (vertical === 'bottom') {
        expect(
          Math.abs(launcher.y - (bubble.y + bubble.height)),
          'card 24px above',
        ).toBeLessThanOrEqual(24 + 1);
        expect(
          Math.abs(launcher.y - 1 - (tail.y + tail.height)),
          'tail meets launcher',
        ).toBeLessThanOrEqual(1);
        await expect(tailLocator, 'points down').toHaveCSS('border-top-width', '24px');
      } else {
        expect(
          Math.abs(bubble.y - (launcher.y + launcher.height)),
          'card 24px below',
        ).toBeLessThanOrEqual(24 + 1);
        expect(
          Math.abs(tail.y - (launcher.y + launcher.height + 1)),
          'tail meets launcher',
        ).toBeLessThanOrEqual(1);
        await expect(tailLocator, 'points up').toHaveCSS('border-bottom-width', '24px');
      }
      const tailInnerEdge = horizontal === 'right' ? tail.x + tail.width : tail.x;
      const launcherInnerEdge = horizontal === 'right' ? launcher.x : launcher.x + launcher.width;
      expect(
        Math.abs(tailInnerEdge - launcherInnerEdge),
        'tail at the launcher edge',
      ).toBeLessThanOrEqual(1);
    });
  }
});
