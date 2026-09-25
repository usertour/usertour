import { type Box, type Gallery, expect, test } from './gallery';

/**
 * The parts of a widget that live on the host page (positioned shells and the
 * iframes they hold) must lay out identically on a plain page and on one with
 * a careless global stylesheet (apps/sdk/gallery/src/hostile-host.css).
 */
type Relation = 'gapRight' | 'gapAbove' | 'centerDx' | 'centerDy';

/**
 * The shell to measure per case. A shell anchored to a host element also names
 * the relations that define its placement (the others move with the anchor's
 * own size, which the hostile stylesheet is free to change).
 */
const SHELLS: Record<string, { selector: string; anchoredBy?: Relation[] }> = {
  'tooltip-right': {
    selector: '[data-usertour-popper-content-wrapper]',
    anchoredBy: ['gapRight', 'centerDy'],
  },
  'flow-modal': { selector: '[data-usertour-popper-content-wrapper]' },
  'flow-bubble': { selector: 'iframe.usertour-widget-bubble__avatar' },
  'checklist-collapsed': { selector: 'iframe.usertour-widget-checklist-launcher' },
  'checklist-expanded': { selector: 'iframe.usertour-widget-surface-viewport' },
  'launcher-icon': { selector: '.usertour-widget-launcher', anchoredBy: ['gapAbove', 'centerDx'] },
  'resource-center-collapsed': { selector: 'iframe.usertour-widget-resource-center-frame' },
  'resource-center-expanded': { selector: 'iframe.usertour-widget-resource-center-frame' },
};

/** Size and border of the shell, plus where it sits (absolute, or its anchoring relations). */
type Layout = {
  size: { width: number; height: number };
  placement: Record<string, number>;
  border: string;
};

const RELATIONS: Record<Relation, (box: Box, anchor: Box) => number> = {
  gapRight: (box, anchor) => box.x - (anchor.x + anchor.width),
  gapAbove: (box, anchor) => anchor.y - (box.y + box.height),
  centerDx: (box, anchor) => box.x + box.width / 2 - (anchor.x + anchor.width / 2),
  centerDy: (box, anchor) => box.y + box.height / 2 - (anchor.y + anchor.height / 2),
};

const layoutOf = async (
  gallery: Gallery,
  url: string,
  { selector, anchoredBy }: (typeof SHELLS)[string],
): Promise<Layout> => {
  await gallery.page.goto(url);
  const shell = gallery.page.locator(selector);
  const box = await gallery.settledBox(shell);
  const border = await shell.evaluate((el) => getComputedStyle(el).borderTopWidth);
  let placement: Record<string, number> = { x: box.x, y: box.y };
  if (anchoredBy) {
    const anchor = await gallery.settledBox(gallery.target);
    placement = Object.fromEntries(anchoredBy.map((r) => [r, RELATIONS[r](box, anchor)]));
  }
  return { size: { width: box.width, height: box.height }, placement, border };
};

const expectSameLayout = (plain: Layout, hostile: Layout) => {
  for (const [key, value] of Object.entries({ ...plain.size, ...plain.placement })) {
    const actual = { ...hostile.size, ...hostile.placement }[key] ?? Number.NaN;
    expect(Math.abs(actual - value), key).toBeLessThanOrEqual(1);
  }
  expect(hostile.border, 'border').toBe(plain.border);
};

for (const [caseName, shell] of Object.entries(SHELLS)) {
  test(`${caseName} lays out the same under a hostile host stylesheet`, async ({ gallery }) => {
    const plain = await layoutOf(gallery, `/?case=${caseName}`, shell);
    const hostile = await layoutOf(gallery, `/?case=${caseName}&host=hostile`, shell);
    expectSameLayout(plain, hostile);
  });
}

test.describe('banner under a hostile host stylesheet', () => {
  // KNOWN BUG, same root cause as banner.spec.ts: the banner frame lives
  // outside #usertour-widget and nothing resets its border, so the host's
  // `iframe { border }` rule lands on it (2px default → the host's 3px).
  test.fail();

  test('banner-stacked-rows lays out the same', async ({ gallery }) => {
    const shell = { selector: 'iframe.usertour-widget-banner-frame' };
    const plain = await layoutOf(gallery, '/?case=banner-stacked-rows-reset-page', shell);
    const hostile = await layoutOf(gallery, '/?case=banner-stacked-rows&host=hostile', shell);
    expectSameLayout(plain, hostile);
  });
});
