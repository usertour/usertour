import { expect, test } from './gallery';

const ICON = '.usertour-widget-launcher';

test('the default launcher sits on top of its target, centered', async ({ gallery }) => {
  await gallery.open('launcher-icon');
  const icon = await gallery.settledBox(gallery.page.locator(ICON));
  const target = await gallery.settledBox(gallery.target);

  expect(icon.y + icon.height, 'icon ends above the target').toBeLessThanOrEqual(target.y + 1);
  expect(Math.abs(icon.x + icon.width / 2 - (target.x + target.width / 2))).toBeLessThanOrEqual(1);
});

test('clicking the launcher opens its tooltip and activates it', async ({ gallery, page }) => {
  await gallery.open('launcher-icon');
  await gallery.settledBox(page.locator(ICON));

  await page.locator(ICON).click();

  await expect(
    page.frameLocator('iframe.usertour-widget-surface-viewport').getByText(/^Welcome aboard!/),
  ).toBeVisible();
  expect(await gallery.methods()).toContain('launcher.handleActivate');
});
