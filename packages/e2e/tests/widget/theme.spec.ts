import { expect, test } from './gallery';

const FRAME = 'iframe.usertour-widget-surface-viewport';

/** '#2563eb' → 'rgb(37, 99, 235)', the form getComputedStyle reports. */
const hexToRgb = (hex: string) => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

for (const theme of ['default', 'dark']) {
  test(`the ${theme} theme's colors reach the panel and its primary button`, async ({
    gallery,
    page,
  }) => {
    await page.goto(`/?case=flow-modal&theme=${theme}`);
    await gallery.settledBox(page.locator(FRAME));
    const frame = page.frameLocator(FRAME);
    const panel = frame.locator('.usertour-widget-surface-panel');
    const button = frame.getByRole('button', { name: 'Next' });

    const colors = await page.evaluate(() => {
      const { mainColor, brandColor } = window.__galleryTheme;
      return { mainColor, brandColor };
    });
    const style = (el: Element) => {
      const cs = getComputedStyle(el);
      return { background: cs.backgroundColor, color: cs.color };
    };

    expect(await panel.evaluate(style)).toEqual({
      background: hexToRgb(colors.mainColor.background),
      color: hexToRgb(colors.mainColor.color),
    });
    expect(await button.evaluate(style)).toEqual({
      background: hexToRgb(colors.brandColor.background),
      color: hexToRgb(colors.brandColor.color),
    });
  });
}
