import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { dismissFlow, flowSession, paragraph, row, twoStepFlow } from './content';
import { expect, type SdkPage, test } from './fixtures';

/**
 * Targets inside frames. The SDK resolves a selector in the page and in every
 * same-origin frame it can read, nested ones included; a tooltip on such a
 * target is positioned with the frame's offset, judged visible in the top
 * window's space and follows the element across the frame's navigations. A
 * cross-origin frame stays opaque.
 */
test.describe('targets inside frames', () => {
  const start = async (sdk: SdkPage) => {
    await sdk.init();
    await sdk.identify('u1');
  };

  /** Far enough from the page's corner that a frame-local position or clip is visibly wrong. */
  const FRAME_BOX = { left: 300, top: 400, width: 640, height: 420 };

  /** Append a frame to the host page and wait for it to load. */
  const mountFrame = (page: Page, frame: { id: string; src: string }) =>
    page.evaluate(
      ({ id, src, box }) =>
        new Promise<void>((resolveLoad) => {
          const element = document.createElement('iframe');
          element.id = id;
          element.src = src;
          element.style.cssText = `position:absolute;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;border:0`;
          element.addEventListener('load', () => resolveLoad(), { once: true });
          document.body.appendChild(element);
        }),
      { ...frame, box: FRAME_BOX },
    );

  type Rect = { x: number; y: number; width: number; height: number };

  /** The activity button's rect in the top window, read through the frames that hold it. */
  const targetRect = (page: Page, frameIds: string[]): Promise<Rect> =>
    page.evaluate((ids) => {
      let win: Window = window;
      let x = 0;
      let y = 0;
      for (const id of ids) {
        const frame = win.document.getElementById(id) as HTMLIFrameElement;
        const rect = frame.getBoundingClientRect();
        x += rect.left + frame.clientLeft;
        y += rect.top + frame.clientTop;
        win = frame.contentWindow as Window;
      }
      const target = win.document.getElementById('activity-submit') as HTMLElement;
      const rect = target.getBoundingClientRect();
      return { x: x + rect.left, y: y + rect.top, width: rect.width, height: rect.height };
    }, frameIds);

  /**
   * The tooltip sits centered under the target, as the step's bottom/center
   * placement asks. The target is read on every try: the SDK scrolls it into
   * view when the step opens, and the page and frames settle at their own pace.
   */
  const expectAttachedBelow = async (sdk: SdkPage, frameIds: string[]) => {
    await expect(sdk.surface).toHaveAttribute('data-usertour-popper-data-placement', /bottom/);
    await expect
      .poll(
        async () => {
          const box = await sdk.surface.boundingBox();
          if (!box) {
            return 'no surface';
          }
          const target = await targetRect(sdk.page, frameIds);
          const centerOffset = Math.abs(box.x + box.width / 2 - (target.x + target.width / 2));
          const gap = box.y - (target.y + target.height);
          return centerOffset < 2 && gap >= 0 && gap < 40
            ? 'under the target'
            : `centerOffset=${centerOffset.toFixed(1)} gap=${gap.toFixed(1)}`;
        },
        { message: 'the tooltip is centered under the target' },
      )
      .toBe('under the target');
  };

  test('a tooltip finds its target inside a same-origin frame and sits under it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page, { id: 'activity', src: '/frame-activity.html' });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk, ['activity']);
    // Visibility is judged in the top window's space: the target, 700px into
    // the page, stays visible past the tolerance that would end the flow.
    await sdk.advance(4_000);
    await expect(sdk.surface).toBeVisible();
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  test('a target inside a nested frame carries both frames’ offsets', async ({ sdk, protocol }) => {
    await start(sdk);
    await mountFrame(sdk.page, { id: 'lesson', src: '/frame-outer.html' });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk, ['lesson', 'inner']);
    await sdk.advance(4_000);
    await expect(sdk.surface).toBeVisible();
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  test('a sequence counts the page first, then the frames, never the SDK’s own frames', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page, { id: 'activity', src: '/frame-activity.html' });
    // The page has two buttons; the SDK's own frames (mounted before the
    // activity frame) hold more, which must not count. The third is the
    // activity's.
    await protocol.push(
      'SetFlowSession',
      twoStepFlow('session-1', 'flow-1', { customSelector: 'button', sequence: '3st' }),
    );
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk, ['activity']);
  });

  test('a frame that navigates keeps the tooltip on the new document’s element', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page, { id: 'activity', src: '/frame-activity.html' });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk, ['activity']);

    await sdk.page.evaluate(() => {
      const frame = document.getElementById('activity') as HTMLIFrameElement;
      frame.contentWindow?.location.reload();
    });
    await expect(sdk.page.frameLocator('#activity').locator('#activity-submit')).toBeVisible();

    await expectAttachedBelow(sdk, ['activity']);
    await sdk.advance(4_000);
    await expect(sdk.surface).toBeVisible();
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  test('an element condition sees an element inside a same-origin frame', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page, { id: 'activity', src: '/frame-activity.html' });
    await protocol.push(
      'SetFlowSession',
      flowSession({
        sessionId: 'session-1',
        contentId: 'flow-1',
        steps: [
          {
            id: 'flow-1-step-1',
            cvid: 'flow-1-cvid-1',
            type: 'modal',
            data: [row(paragraph('Going away soon'))],
            trigger: [
              {
                id: 'trigger-1',
                conditions: [
                  {
                    id: 'trigger-cond-1',
                    type: 'element',
                    operators: 'and',
                    data: {
                      logic: 'present',
                      elementData: {
                        type: 'manual',
                        customSelector: '#activity-submit',
                        sequence: '1st',
                      },
                    },
                  },
                ],
                actions: [dismissFlow()],
                wait: 2,
              },
            ],
          },
        ],
      }),
    );
    await expect(sdk.frame().getByText('Going away soon')).toBeVisible();
    await sdk.advance(3_000);
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toMatchObject({
      endReason: 'trigger_dismiss',
    });
  });

  test('a cross-origin frame is opaque: its target is reported missing', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    // The same activity page, served from another origin.
    const activityHtml = readFileSync(
      resolve(__dirname, '../../hosts/frame-activity.html'),
      'utf8',
    );
    await sdk.page.route('http://lesson.example/**', (route) =>
      route.fulfill({ body: activityHtml, contentType: 'text/html' }),
    );
    await mountFrame(sdk.page, { id: 'activity', src: 'http://lesson.example/activity' });
    await expect(sdk.page.frameLocator('#activity').locator('#activity-submit')).toBeVisible();
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    // The element watcher retries every 200ms until the theme's tolerance (3s).
    await sdk.advance(4_000);
    await protocol.waitForMessages('ReportTooltipTargetMissing', 1);
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toMatchObject({
      endReason: 'tooltip_target_missing',
    });
  });
});
