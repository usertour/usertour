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
