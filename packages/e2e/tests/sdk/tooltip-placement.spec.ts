import { flowSession, paragraph, row, type StepInput } from './content';
import { expect, type SdkPage, test } from './fixtures';
import type { ProtocolServer } from './protocol-server';

/**
 * Where a tooltip lands when its target leaves it no room: it stays on screen
 * whether or not it may flip, overlapping the target when no side fits, and a
 * target taller than the viewport is scrolled to its top rather than its
 * middle, so a tooltip placed along that edge is in view.
 */
test.describe('tooltip placement', () => {
  const TARGET_ID = 'placement-target';
  const TOOLTIP_TEXT = 'Every row at a glance';

  /** Adds the tooltip's target to the host page, laid out by `style`. */
  const addTarget = (sdk: SdkPage, style: string) =>
    sdk.page.evaluate(
      ({ id, style }) => {
        const target = document.createElement('div');
        target.id = id;
        target.setAttribute('style', style);
        document.body.appendChild(target);
      },
      { id: TARGET_ID, style },
    );

  const showTooltip = async (
    sdk: SdkPage,
    protocol: ProtocolServer,
    setting: StepInput['setting'],
  ) => {
    await sdk.init();
    await sdk.identify('u1');
    await protocol.push(
      'SetFlowSession',
      flowSession({
        sessionId: 'session-1',
        contentId: 'flow-1',
        steps: [
          {
            id: 'flow-1-step-1',
            cvid: 'flow-1-cvid-1',
            type: 'tooltip',
            target: `#${TARGET_ID}`,
            data: [row(paragraph(TOOLTIP_TEXT))],
            setting,
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText(TOOLTIP_TEXT)).toBeVisible();
    // The surface starts offset and eases into place once its position has held for 250ms.
    await sdk.advance(250);
  };

  const surfaceInsideViewport = async (sdk: SdkPage) => {
    const box = await sdk.surface.boundingBox();
    const viewport = sdk.page.viewportSize();
    if (!box || !viewport) {
      return false;
    }
    return (
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height
    );
  };

  const targetTop = (sdk: SdkPage) =>
    sdk.page
      .locator(`#${TARGET_ID}`)
      .evaluate((target) => Math.round(target.getBoundingClientRect().top));

  const arrowVisibility = (sdk: SdkPage) =>
    sdk.surface.locator(':scope > span').evaluate((arrow) => getComputedStyle(arrow).visibility);

  test('a target taller than the viewport is scrolled to its top, with the tooltip beside it', async ({
    sdk,
    protocol,
  }) => {
    // Starts below the fold and runs far past the viewport's height; there is
    // room on its left.
    await addTarget(sdk, 'margin: 600px 0 0 520px; width: 400px; height: 2400px;');
    await showTooltip(sdk, protocol, { side: 'left', align: 'start' });

    await expect.poll(() => targetTop(sdk)).toBe(0);
    await expect.poll(() => surfaceInsideViewport(sdk)).toBe(true);
    await expect(sdk.surface).toHaveAttribute('data-usertour-popper-data-placement', 'left');
    expect(await arrowVisibility(sdk)).toBe('visible');
  });

  test('a fixed tooltip whose side has no room is pushed back on screen over its target, without an arrow', async ({
    sdk,
    protocol,
  }) => {
    // Hugs the page's left edge: no room for a tooltip on its left.
    await addTarget(sdk, 'margin: 24px 0 0 0; width: 900px; height: 200px;');
    await showTooltip(sdk, protocol, { side: 'left', align: 'center' });

    await expect.poll(() => surfaceInsideViewport(sdk)).toBe(true);
    // Still on the side the author chose: a fixed tooltip never flips.
    await expect(sdk.surface).toHaveAttribute('data-usertour-popper-data-placement', 'left');
    await expect.poll(() => arrowVisibility(sdk)).toBe('hidden');
  });

  test('an auto tooltip whose target leaves no room above or below is pushed back on screen', async ({
    sdk,
    protocol,
  }) => {
    await addTarget(sdk, 'margin: 600px 0 0 0; width: 900px; height: 2400px;');
    await showTooltip(sdk, protocol, { alignType: 'auto' });

    // Wait out the scroll: while the target is still below the fold, a tooltip
    // flipped above it fits on screen for a moment.
    await expect.poll(() => targetTop(sdk)).toBe(0);
    await expect.poll(() => surfaceInsideViewport(sdk)).toBe(true);
    await expect.poll(() => arrowVisibility(sdk)).toBe('hidden');
  });
});
