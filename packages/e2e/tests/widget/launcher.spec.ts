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

test.describe('a hover launcher', () => {
  const TOOLTIP = '[data-usertour-popper-content-wrapper]';

  test('opens on hover and closes once the pointer leaves', async ({ gallery, page }) => {
    await gallery.open('launcher-hover');
    await gallery.settledBox(page.locator(ICON));

    await page.locator(ICON).hover();
    await expect(page.locator(TOOLTIP)).toBeVisible();
    expect(await gallery.methods()).toContain('launcher.handleActivate');

    // Somewhere empty, away from both the launcher and its tooltip.
    await page.mouse.move(40, 760);
    await expect(page.locator(TOOLTIP)).toBeHidden();
    expect(await gallery.methods()).toContain('launcher.onTooltipClose');
  });

  test('stays open while the pointer moves onto its tooltip, and closes after leaving it', async ({
    gallery,
    page,
  }) => {
    // KNOWN BUG (found 2026-09-25): leaving the tooltip never closes it.
    // usePopperMouseLeave (apps/sdk/src/components/launcher.tsx) binds its
    // mouseleave in an effect that runs once at mount, while the tooltip is
    // not rendered yet (popperRef.current is null), and never re-runs. Only a
    // click outside, or re-entering and leaving the launcher, closes it.
    test.fail();
    await gallery.open('launcher-hover');
    await gallery.settledBox(page.locator(ICON));

    await page.locator(ICON).hover();
    const tooltip = await gallery.settledBox(page.locator(TOOLTIP));
    await page.mouse.move(tooltip.x + tooltip.width / 2, tooltip.y + tooltip.height / 2);
    await page.waitForTimeout(300);
    await expect(page.locator(TOOLTIP), 'kept open while hovered').toBeVisible();

    await page.mouse.move(40, 760);
    await expect(page.locator(TOOLTIP), 'closed after the pointer left it').toBeHidden();
  });
});

// Guards ee9a1b70c: an inline opacity used to override the theme's icon opacity.
test("an icon launcher takes the theme's opacity", async ({ gallery, page }) => {
  await gallery.open('launcher-icon-dimmed');
  await gallery.settledBox(page.locator(ICON));
  await expect(page.locator(ICON)).toHaveCSS('opacity', '0.5');
});
