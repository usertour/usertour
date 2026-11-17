import { expect, test } from './gallery';

// The builder and theme previews render the embed as a static card, not in an
// iframe. The iframe's border reset once lived in the wrapper style they share,
// so it was applied inline on the card and hid the theme's border.
test('the embed preview card shows the theme’s border', async ({ gallery, page }) => {
  await gallery.open('embed-preview-bordered');
  const card = page.locator('.usertour-widget-embed > div').first();
  await expect(card).toBeVisible();
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('2px');
});

// The live cover's frame is stretched to the target's box minus its vertical
// margin. The preview card was full height plus that margin, so it overflowed
// the box and scrolled.
test('a cover preview with an outer margin fits its box, as the live cover does', async ({
  gallery,
  page,
}) => {
  await gallery.open('embed-preview-cover-margin');
  const box = page.locator('[data-cover-box]');
  const card = page.locator('.usertour-widget-embed > div').first();
  await expect(card).toBeVisible();
  const layout = await box.evaluate((el) => {
    const boxRect = el.getBoundingClientRect();
    const cardRect = (
      el.querySelector('.usertour-widget-embed > div') as HTMLElement
    ).getBoundingClientRect();
    return {
      top: cardRect.top - boxRect.top,
      bottom: boxRect.bottom - cardRect.bottom,
      height: cardRect.height,
      overflow: el.scrollHeight - el.clientHeight,
    };
  });
  expect(layout).toEqual({ top: 16, bottom: 24, height: 180, overflow: 0 });
});
