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
