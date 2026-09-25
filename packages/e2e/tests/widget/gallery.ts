import { type Locator, type Page, test as base, expect } from '@playwright/test';

export type Box = { x: number; y: number; width: number; height: number };

type RecordedCall = { method: string; args: unknown[] };

declare global {
  interface Window {
    /** Filled by the gallery's fake SDK instances (apps/sdk/gallery/src/calls.ts). */
    __galleryCalls: RecordedCall[];
  }
}

/** Drives one case of the SDK widget gallery (apps/sdk/gallery). */
export class Gallery {
  constructor(readonly page: Page) {}

  async open(caseName: string) {
    await this.page.goto(`/?case=${caseName}`);
  }

  /** The host-page element the widget attaches to. */
  get target(): Locator {
    return this.page.locator('[data-gallery-target]');
  }

  /** The floating surface of a tooltip (the element floating-ui positions). */
  get tooltip(): Locator {
    return this.page.locator('[data-usertour-popper-content-wrapper]');
  }

  /** Every call the widget made on its SDK instance, in order. */
  calls(): Promise<RecordedCall[]> {
    return this.page.evaluate(() => window.__galleryCalls);
  }

  /** Just the method names of `calls()`, for order/presence assertions. */
  async methods(): Promise<string[]> {
    return (await this.calls()).map((call) => call.method);
  }

  /**
   * The element's box once it is visible and at rest: nothing animating on it
   * or inside it, and the same box on two reads 100ms apart.
   */
  async settledBox(locator: Locator): Promise<Box> {
    await expect(locator).toBeVisible();
    const handle = await locator.elementHandle();
    await this.page.waitForFunction(
      (el) => (el as Element).getAnimations({ subtree: true }).length === 0,
      handle,
    );
    let previous = await locator.boundingBox();
    for (;;) {
      await this.page.waitForTimeout(100);
      const current = await locator.boundingBox();
      if (current && previous && JSON.stringify(current) === JSON.stringify(previous)) {
        return current;
      }
      previous = current;
    }
  }

  /**
   * The tooltip's box once it has finished arriving. It first renders 20px off
   * (`transition: none`), waits for its position to hold still, then slides in
   * with a CSS transition; it has landed when that transition has started and
   * no animation is still running on it.
   */
  async landedTooltipBox(): Promise<Box> {
    await expect(this.tooltip).toBeVisible();
    const handle = await this.tooltip.elementHandle();
    await this.page.waitForFunction((el) => {
      const style = (el as HTMLElement).style;
      return (
        style.transition !== '' && style.transition !== 'none' && el.getAnimations().length === 0
      );
    }, handle);
    return (await this.tooltip.boundingBox()) as Box;
  }
}

export const test = base.extend<{ gallery: Gallery }>({
  gallery: async ({ page, baseURL }, use) => {
    // The gallery is self-contained. Anything off-origin would make a result
    // depend on the network, so it is refused outright.
    const origin = new URL(baseURL as string).origin;
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await use(new Gallery(page));

    expect(pageErrors, 'uncaught errors on the gallery page').toEqual([]);
  },
});

export { expect };
