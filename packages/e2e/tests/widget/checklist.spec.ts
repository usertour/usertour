import { expect, test } from './gallery';

const LAUNCHER = 'iframe.usertour-widget-checklist-launcher';
const PANEL = 'iframe.usertour-widget-surface-viewport';

test('a collapsed checklist opens from its launcher and lists its tasks', async ({
  gallery,
  page,
}) => {
  await gallery.open('checklist-collapsed');
  await gallery.settledBox(page.locator(LAUNCHER));

  await page
    .frameLocator(LAUNCHER)
    .getByRole('button', { name: /Open checklist/ })
    .click();

  expect(await gallery.calls()).toContainEqual({
    method: 'checklist.handleExpandedChange',
    args: [true],
  });
  const panel = page.frameLocator(PANEL);
  for (const name of ['Invite your team', 'Connect a data source', 'Publish your first flow']) {
    await expect(panel.getByRole('button', { name: new RegExp(name) })).toBeVisible();
  }
});

test('clicking an unfinished task tells the SDK which task it was', async ({ gallery, page }) => {
  await gallery.open('checklist-expanded');
  await gallery.settledBox(page.locator(PANEL));

  await page
    .frameLocator(PANEL)
    .getByRole('button', { name: 'Complete task: Connect a data source' })
    .click();

  expect(await gallery.calls()).toContainEqual({
    method: 'checklist.handleItemClick',
    args: ['connect'],
  });
});

test('dismissing with tasks left asks first, and Cancel keeps the checklist', async ({
  gallery,
  page,
}) => {
  await gallery.open('checklist-expanded');
  await gallery.settledBox(page.locator(PANEL));
  const panel = page.frameLocator(PANEL);

  await panel.getByRole('button', { name: 'Dismiss checklist' }).click();
  await expect(panel.getByText('Dismiss checklist?')).toBeVisible();
  expect(await gallery.methods()).not.toContain('checklist.handleDismiss');

  await panel.getByRole('button', { name: 'Cancel' }).click();
  await expect(panel.getByRole('button', { name: /Connect a data source/ })).toBeVisible();

  await panel.getByRole('button', { name: 'Dismiss checklist' }).click();
  await panel.getByRole('button', { name: 'Yes, dismiss' }).click();
  expect(await gallery.methods()).toContain('checklist.handleDismiss');
});

test('dismissing a finished checklist needs no confirmation', async ({ gallery, page }) => {
  await gallery.open('checklist-finished');
  await gallery.settledBox(page.locator(PANEL));
  const panel = page.frameLocator(PANEL);

  await panel.getByRole('button', { name: 'Dismiss checklist' }).click();

  expect(await gallery.methods()).toContain('checklist.handleDismiss');
  await expect(panel.getByText('Dismiss checklist?')).toHaveCount(0);
});

// Guards the theme fix that stopped a checkmark color of 'Auto' from reaching
// CSS as the literal string (it rendered transparent).
test('a checkmark color left on Auto takes the brand color', async ({ gallery, page }) => {
  await gallery.open('checklist-auto-checkmark');
  await gallery.settledBox(page.locator(PANEL));

  const checkmark = page
    .frameLocator(PANEL)
    .locator('button[aria-label^="Uncomplete task: "] span')
    .first();
  const brand = await page.evaluate(() => window.__galleryTheme.brandColor.background);
  const n = Number.parseInt(brand.replace('#', ''), 16);

  await expect(checkmark).toHaveCSS(
    'background-color',
    `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`,
  );
});
