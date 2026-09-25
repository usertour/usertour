import { expect, test } from './gallery';

type Box = { x: number; y: number; width: number; height: number };

// Default theme: notchSize 20 → a 10px-tall arrow. floating-ui offsets the
// tooltip by sideOffset (0 in these cases) + arrow height, so the arrow fills
// the gap exactly.
const EXPECTED_GAP = 10;
const TOLERANCE = 1;

const centerX = (b: Box) => b.x + b.width / 2;
const centerY = (b: Box) => b.y + b.height / 2;

const SIDES = {
  right: {
    gap: (target: Box, tip: Box) => tip.x - (target.x + target.width),
    misalignment: (target: Box, tip: Box) => centerY(tip) - centerY(target),
  },
  left: {
    gap: (target: Box, tip: Box) => target.x - (tip.x + tip.width),
    misalignment: (target: Box, tip: Box) => centerY(tip) - centerY(target),
  },
  top: {
    gap: (target: Box, tip: Box) => target.y - (tip.y + tip.height),
    misalignment: (target: Box, tip: Box) => centerX(tip) - centerX(target),
  },
  bottom: {
    gap: (target: Box, tip: Box) => tip.y - (target.y + target.height),
    misalignment: (target: Box, tip: Box) => centerX(tip) - centerX(target),
  },
} as const;

type Side = keyof typeof SIDES;

const expectBeside = async (
  gallery: import('./gallery').Gallery,
  side: Side,
): Promise<{ target: Box; tip: Box }> => {
  const tip = await gallery.landedTooltipBox();
  const target = (await gallery.target.boundingBox()) as Box;
  const { gap, misalignment } = SIDES[side];

  await expect(gallery.tooltip).toHaveAttribute('data-usertour-popper-data-placement', side);
  expect(
    Math.abs(gap(target, tip) - EXPECTED_GAP),
    `gap to the ${side} of the target`,
  ).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(misalignment(target, tip)), 'centered on the target').toBeLessThanOrEqual(
    TOLERANCE,
  );
  return { target, tip };
};

for (const side of Object.keys(SIDES) as Side[]) {
  test(`a ${side}-placed tooltip sits ${EXPECTED_GAP}px ${side} of its target, centered on it`, async ({
    gallery,
  }) => {
    await gallery.open(`tooltip-${side}`);
    await expectBeside(gallery, side);
  });
}

test('a right-placed tooltip on an item of a fixed, scrollable sidebar sits beside the item', async ({
  gallery,
}) => {
  await gallery.open('tooltip-fixed-sidebar');
  await expectBeside(gallery, 'right');
});

test('a tooltip follows its target when content inserted above pushes the target down', async ({
  gallery,
}) => {
  await gallery.open('tooltip-target-shifts');
  const before = await expectBeside(gallery, 'right');

  await gallery.page.locator('[data-gallery-action="shift"]').click();

  // The target moved; the tooltip must end up beside it again.
  await expect
    .poll(
      async () => {
        const tip = (await gallery.tooltip.boundingBox()) as Box;
        const target = (await gallery.target.boundingBox()) as Box;
        const { gap, misalignment } = SIDES.right;
        return Math.max(
          Math.abs(gap(target, tip) - EXPECTED_GAP),
          Math.abs(misalignment(target, tip)),
        );
      },
      { message: 'tooltip distance from its place beside the moved target', timeout: 3000 },
    )
    .toBeLessThanOrEqual(TOLERANCE);
  const after = (await gallery.target.boundingBox()) as Box;
  expect(after.y - before.target.y, 'the target really moved').toBeGreaterThan(100);
});

test('a centered modal step sits in the middle of the viewport', async ({ gallery, page }) => {
  await gallery.open('flow-modal');
  const modal = await gallery.settledBox(gallery.tooltip);
  const viewport = page.viewportSize() as { width: number; height: number };

  expect(Math.abs(centerX(modal) - viewport.width / 2)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(centerY(modal) - viewport.height / 2)).toBeLessThanOrEqual(TOLERANCE);
});

test('a bubble step sits above its avatar in the bottom-left corner', async ({ gallery, page }) => {
  await gallery.open('flow-bubble');
  const avatar = await gallery.settledBox(page.locator('iframe.usertour-widget-bubble__avatar'));
  // The positioned wrapper holds bubble AND avatar; the bubble is its content frame.
  const bubble = await gallery.settledBox(page.locator('iframe.usertour-widget-surface-viewport'));
  const viewport = page.viewportSize() as { width: number; height: number };

  // Default theme: leftBottom placement, 20px from both edges.
  expect(Math.abs(avatar.x - 20)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(viewport.height - (avatar.y + avatar.height) - 20)).toBeLessThanOrEqual(
    TOLERANCE,
  );
  expect(Math.abs(bubble.x - avatar.x)).toBeLessThanOrEqual(TOLERANCE);
  expect(bubble.y + bubble.height, 'bubble ends above the avatar').toBeLessThanOrEqual(avatar.y);
});
