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
