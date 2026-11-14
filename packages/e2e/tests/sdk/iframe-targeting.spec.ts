import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Frame, Locator, Page } from '@playwright/test';
import {
  bannerSession,
  button,
  dismissFlow,
  flowSession,
  launcherSession,
  oneStepEmbed,
  paragraph,
  row,
  twoStepFlow,
} from './content';
import { RUNTIME_HOST_URL, SDK_BUNDLE_URL, type SdkPage, expect, test } from './fixtures';
import type { ProtocolServer } from './protocol-server';

/**
 * Targets inside frames. The SDK resolves a selector in its page and in every
 * same-origin frame it can read, nested ones included; a tooltip on such a
 * target is positioned with the frame's offset, judged visible in the SDK's
 * own window's space and follows the element across the frame's navigations.
 * A cross-origin frame stays opaque. The SDK's page may itself be embedded in
 * a frame: its window is then not the top one.
 */
test.describe('targets inside frames', () => {
  const start = async (sdk: SdkPage) => {
    await sdk.init();
    await sdk.identify('u1');
  };

  /**
   * Where a frame is laid out; `scale` draws it larger or smaller from its
   * top-left corner, `border` (px) moves its document inside its box.
   */
  type Box = {
    left: number;
    top: number;
    width: number;
    height: number;
    scale?: number;
    border?: number;
  };

  /** Far enough from the page's corner that a frame-local position or clip is visibly wrong. */
  const FRAME_BOX: Box = { left: 300, top: 400, width: 640, height: 420 };

  /** Append a frame to a document and wait for it to load. */
  const mountFrame = (parent: Frame, frame: { id: string; src: string }, box: Box = FRAME_BOX) =>
    parent.evaluate(
      ({ id, src, box }) =>
        new Promise<void>((resolveLoad) => {
          const element = document.createElement('iframe');
          element.id = id;
          element.src = src;
          element.style.cssText = `position:absolute;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;border:${box.border ?? 0}px solid #9ca3af;transform-origin:0 0;transform:scale(${box.scale ?? 1})`;
          element.addEventListener('load', () => resolveLoad(), { once: true });
          document.body.appendChild(element);
        }),
      { ...frame, box },
    );

  type Rect = { x: number; y: number; width: number; height: number };

  /**
   * An element's rect in the top window, read through the frames that hold it,
   * each of which may be drawn at a scale. `client` reads the area inside the
   * element's borders instead: what a scroll box or a frame shows.
   */
  const rectInTopWindow = (
    page: Page,
    frameIds: string[],
    selector: string,
    area: 'border' | 'client' = 'border',
  ): Promise<Rect> =>
    page.evaluate(
      ({ ids, selector, area }) => {
        let win: Window = window;
        let x = 0;
        let y = 0;
        let scale = 1;
        for (const id of ids) {
          const frame = win.document.getElementById(id) as HTMLIFrameElement;
          const rect = frame.getBoundingClientRect();
          const frameScale = rect.width / frame.offsetWidth;
          x += (rect.left + frame.clientLeft * frameScale) * scale;
          y += (rect.top + frame.clientTop * frameScale) * scale;
          scale *= frameScale;
          win = frame.contentWindow as Window;
        }
        const element = win.document.querySelector(selector) as HTMLElement;
        const rect = element.getBoundingClientRect();
        if (area === 'client') {
          const ownScale = rect.width / element.offsetWidth;
          return {
            x: x + (rect.left + element.clientLeft * ownScale) * scale,
            y: y + (rect.top + element.clientTop * ownScale) * scale,
            width: element.clientWidth * ownScale * scale,
            height: element.clientHeight * ownScale * scale,
          };
        }
        return {
          x: x + rect.left * scale,
          y: y + rect.top * scale,
          width: rect.width * scale,
          height: rect.height * scale,
        };
      },
      { ids: frameIds, selector, area },
    );

  /**
   * The tooltip sits centered under the target, as the step's bottom/center
   * placement asks. The target is read on every try: the SDK scrolls it into
   * view when the step opens, and the page and frames settle at their own pace.
   */
  const expectAttachedBelow = async (
    page: Page,
    surface: Locator,
    frameIds: string[],
    selector = '#activity-submit',
  ) => {
    await expect(surface).toHaveAttribute('data-usertour-popper-data-placement', /bottom/);
    await expect
      .poll(
        async () => {
          const box = await surface.boundingBox();
          if (!box) {
            return 'no surface';
          }
          const target = await rectInTopWindow(page, frameIds, selector);
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

  /** Ask the page to track "this input's value is …" and return its reports, newest last. */
  const trackTextInputIs = async (protocol: ProtocolServer, selector: string, value: string) => {
    const condition = {
      id: `text-input-is:${selector}`,
      type: 'text-input',
      operators: 'and',
      data: {
        logic: 'is',
        value,
        elementData: { type: 'manual', customSelector: selector, sequence: '1st' },
      },
    };
    await protocol.push('TrackClientCondition', {
      contentId: 'flow-1',
      contentType: 'flow',
      versionId: 'version-1',
      condition,
    });
    return () =>
      protocol
        .messages('ToggleClientCondition')
        .map((seen) => seen.message.payload as { conditionId: string; isActive: boolean })
        .filter((payload) => payload.conditionId === condition.id);
  };

  test('a tooltip finds its target inside a same-origin frame and sits under it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk.page, sdk.surface, ['activity']);
    // Visibility is judged in the page's space: the target, 700px into the
    // page, stays visible past the tolerance that would end the flow.
    await sdk.advance(4_000);
    await expect(sdk.surface).toBeVisible();
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  test('a target inside a nested frame carries both frames’ offsets', async ({ sdk, protocol }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'lesson', src: '/frame-outer.html' });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk.page, sdk.surface, ['lesson', 'inner']);
    await sdk.advance(4_000);
    await expect(sdk.surface).toBeVisible();
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  test('a sequence counts the page first, then the frames, never the SDK’s own frames', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
    // The page has two buttons; the SDK's own frames (mounted before the
    // activity frame) hold more, which must not count. The third is the
    // activity's.
    await protocol.push(
      'SetFlowSession',
      twoStepFlow('session-1', 'flow-1', { customSelector: 'button', sequence: '3st' }),
    );
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk.page, sdk.surface, ['activity']);
  });

  test('a frame that navigates keeps the tooltip on the new document’s element', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk.page, sdk.surface, ['activity']);

    await sdk.page.evaluate(() => {
      const frame = document.getElementById('activity') as HTMLIFrameElement;
      frame.contentWindow?.location.reload();
    });
    await expect(sdk.page.frameLocator('#activity').locator('#activity-submit')).toBeVisible();

    await expectAttachedBelow(sdk.page, sdk.surface, ['activity']);
    await sdk.advance(4_000);
    await expect(sdk.surface).toBeVisible();
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  test('an element condition sees an element inside a same-origin frame', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
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
    await mountFrame(sdk.page.mainFrame(), {
      id: 'activity',
      src: 'http://lesson.example/activity',
    });
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

  test('a frame drawn at a scale: its target is judged where it is drawn', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    // 560×340 drawn at 1.5×: the button, at (420, 300) in the frame, is drawn
    // 630px right of the frame's corner — outside the frame's unscaled box.
    await mountFrame(
      sdk.page.mainFrame(),
      { id: 'activity', src: '/frame-activity.html' },
      { left: 40, top: 40, width: 560, height: 340, scale: 1.5 },
    );
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk.page, sdk.surface, ['activity']);
    await sdk.advance(4_000);
    await expect(sdk.surface).toBeVisible();
    expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
  });

  test('a text-input condition reads an input inside a same-origin frame', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
    const answer = sdk.page.frameLocator('#activity').locator('#activity-answer');
    await answer.fill('42');

    const reports = await trackTextInputIs(protocol, '#activity-answer', '42');
    await expect.poll(() => reports().length).toBe(1);
    expect(reports()[0].isActive).toBe(true);

    await answer.fill('7');
    // The conditions monitor polls once a second.
    await sdk.advance(1_000);
    await expect.poll(() => reports().length).toBe(2);
    expect(reports()[1].isActive).toBe(false);
  });

  test('a text-input condition reads an input the page created and moved into a frame', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
    // Created by the page's document, so an instance of the page's
    // constructors, yet living in the frame's document.
    await sdk.page.evaluate(() => {
      const frame = document.getElementById('activity') as HTMLIFrameElement;
      const input = document.createElement('input');
      input.id = 'moved-answer';
      input.value = '42';
      frame.contentDocument?.body.append(input);
    });

    const reports = await trackTextInputIs(protocol, '#moved-answer', '42');
    await expect.poll(() => reports().length).toBe(1);
    expect(reports()[0].isActive).toBe(true);
  });

  test('a press inside the frame closes the tooltip of a launcher whose target is in it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
    await protocol.push(
      'AddLauncher',
      launcherSession({
        sessionId: 'launcher-session-1',
        contentId: 'launcher-1',
        target: '#activity-submit',
        text: 'Start here',
      }),
    );
    const launcher = sdk.page.locator('.usertour-widget-launcher');
    await expect(launcher).toBeVisible();
    await launcher.click();
    await expect(sdk.frame().getByText('Start here')).toBeVisible();

    // A press in the frame's document does not bubble to the page's.
    await sdk.page.frameLocator('#activity').getByRole('heading').click();
    await expect(sdk.frame().getByText('Start here')).toBeHidden();
  });

  test('a press in the frame between the page and a nested target closes it too', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    // Large enough to show the lesson's inner frame whole.
    await mountFrame(
      sdk.page.mainFrame(),
      { id: 'lesson', src: '/frame-outer.html' },
      { left: 100, top: 60, width: 760, height: 620 },
    );
    await protocol.push(
      'AddLauncher',
      launcherSession({
        sessionId: 'launcher-session-1',
        contentId: 'launcher-1',
        target: '#activity-submit',
        text: 'Start here',
      }),
    );
    const launcher = sdk.page.locator('.usertour-widget-launcher');
    await expect(launcher).toBeVisible();
    await launcher.click();
    await expect(sdk.frame().getByText('Start here')).toBeVisible();

    // The lesson page is neither the SDK's document nor the target's.
    await sdk.page.frameLocator('#lesson').getByRole('heading', { name: 'Lesson' }).click();
    await expect(sdk.frame().getByText('Start here')).toBeHidden();
  });

  test('the SDK’s own banner frame is not a place selectors are resolved in', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetBannerSession',
      bannerSession({
        sessionId: 'banner-session-1',
        contentId: 'banner-1',
        text: 'Maintenance tonight',
      }),
    );
    const banner = sdk.page.frameLocator('iframe.usertour-widget-banner-frame');
    await expect(banner.getByText('Maintenance tonight')).toBeVisible();
    // The banner's frame sits outside the SDK's mount point and holds a button
    // of its own. The page has two: a third match would be the banner's, and
    // without one the selector falls back to the page's first.
    await protocol.push(
      'SetFlowSession',
      twoStepFlow('session-1', 'flow-1', { customSelector: 'button', sequence: '3st' }),
    );
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
    await expectAttachedBelow(sdk.page, sdk.surface, [], '#cta');
  });

  test('a banner is not embedded at an element inside a frame', async ({ sdk, protocol }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
    await protocol.push(
      'SetBannerSession',
      bannerSession({
        sessionId: 'banner-session-1',
        contentId: 'banner-1',
        text: 'Maintenance tonight',
        placement: 'top-of-container-element',
        container: '#activity-notice',
      }),
    );
    // The banner looks for its container every 200ms; give it several turns.
    await sdk.advance(2_000);
    await sdk.page.waitForTimeout(300);
    await expect(sdk.page.frameLocator('#activity').locator('.usertour-widget-banner')).toHaveCount(
      0,
    );
    await expect(sdk.page.locator('.usertour-widget-banner')).toHaveCount(0);
  });

  test('an embed’s target is looked up in the page, not in a frame', async ({ sdk, protocol }) => {
    await start(sdk);
    await mountFrame(sdk.page.mainFrame(), { id: 'activity', src: '/frame-activity.html' });
    await protocol.push(
      'AddEmbed',
      oneStepEmbed('embed-session-1', 'embed-1', '#activity-submit', 'Upgrade to unlock reports'),
    );
    // The embed looks for its target every 200ms; give it several turns.
    await sdk.advance(2_000);
    await sdk.page.waitForTimeout(300);
    const embed = '.usertour-widget-embed';
    await expect(sdk.page.frameLocator('#activity').locator(embed)).toHaveCount(0);
    await expect(sdk.page.locator(embed)).toHaveCount(0);

    // The page gets an element of that id later: the embed is still looking,
    // and inserts itself after that one.
    await sdk.page.evaluate(() => {
      const late = document.createElement('div');
      late.id = 'activity-submit';
      document.querySelector('main')?.append(late);
    });
    await sdk.advance(2_000);
    await expect(
      sdk.page
        .frameLocator('iframe.usertour-widget-embed-frame')
        .getByText('Upgrade to unlock reports'),
    ).toBeVisible();
    const previous = await sdk.page
      .locator(embed)
      .evaluate((shell) => shell.previousElementSibling?.id);
    expect(previous).toBe('activity-submit');
  });

  test.describe('a target in a box that scrolls', () => {
    /**
     * One scroll box, four ways: a scrolling element on the page (no frame),
     * a frame whose document scrolls, that frame drawn at 1.5×, and that frame
     * inside another frame. Each lays the box out at the same place with the
     * same content, so each must give the same answer on every row below: the
     * tooltip shows while any part of the target is in the box, the spotlight
     * opens on exactly that part, and once none of it is the tooltip hides
     * without ending the flow, until the target is scrolled back.
     */
    const BOX: Box = { left: 300, top: 200, width: 480, height: 300, border: 2 };
    const FRAME = { id: 'scroller', src: '/frame-scroller.html' };

    type Container = {
      name: string;
      /** The frames from the SDK's page down to the target's document; none for the element. */
      frames: string[];
      mount: (page: Page) => Promise<void>;
    };

    const CONTAINERS: Container[] = [
      {
        name: 'a scrolling element on the page',
        frames: [],
        mount: (page) =>
          page.evaluate(async (box) => {
            // The frame's body, copied, so the element and the frames share one geometry.
            const html = await (await fetch('/frame-scroller.html')).text();
            const source = new DOMParser().parseFromString(html, 'text/html');
            const scroller = document.createElement('div');
            scroller.id = 'scroller';
            scroller.style.cssText = `position:absolute;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;border:${box.border}px solid #9ca3af;overflow:auto`;
            for (const child of Array.from(source.body.children)) {
              scroller.appendChild(document.adoptNode(child));
            }
            document.body.appendChild(scroller);
          }, BOX),
      },
      {
        name: 'a same-origin frame',
        frames: ['scroller'],
        mount: (page) => mountFrame(page.mainFrame(), FRAME, BOX),
      },
      {
        name: 'a frame drawn at 1.5×',
        frames: ['scroller'],
        mount: (page) => mountFrame(page.mainFrame(), FRAME, { ...BOX, scale: 1.5 }),
      },
      {
        name: 'a frame inside another frame',
        frames: ['holder', 'scroller'],
        // The holder lays its frame out at (40, 80) with the same border, so the box lands on BOX.
        mount: (page) =>
          mountFrame(
            page.mainFrame(),
            { id: 'holder', src: '/frame-scroller-outer.html' },
            { left: BOX.left - 40, top: BOX.top - 80, width: 560, height: 420 },
          ),
      },
    ];

    /** The target is 400–480px down the box's content; the box shows 300px of it. */
    const SCENARIOS = [
      { name: 'fully inside, low in the box', scrollTop: 250, expected: 'shown' },
      { name: 'fully inside, 10px below the top edge', scrollTop: 390, expected: 'shown' },
      { name: 'half scrolled out over the top edge', scrollTop: 440, expected: 'shown' },
      { name: 'scrolled out above the box', scrollTop: 520, expected: 'hidden' },
    ] as const;

    /** One tooltip step on the target, with the backdrop on so the spotlight opens on it. */
    const spotlightFlow = () =>
      flowSession({
        sessionId: 'session-1',
        contentId: 'flow-1',
        steps: [
          {
            id: 'flow-1-step-1',
            cvid: 'flow-1-cvid-1',
            type: 'tooltip',
            target: '#scroll-target',
            setting: { enabledBackdrop: true },
            data: [row(paragraph('Click here to begin')), row(button('Done', [dismissFlow()]))],
          },
        ],
      });

    /** Scroll the box: the element on the page, or the innermost frame's document. */
    const scrollBox = (page: Page, frames: string[], top: number) =>
      page.evaluate(
        ({ ids, top }) => {
          let doc = document;
          for (const id of ids) {
            doc = (doc.getElementById(id) as HTMLIFrameElement).contentDocument as Document;
          }
          const scroller = ids.length > 0 ? doc.scrollingElement : doc.getElementById('scroller');
          (scroller as Element).scrollTop = top;
        },
        { ids: frames, top },
      );

    /** The part of the target the box shows, in the SDK page's viewport. */
    const visiblePart = async (page: Page, frames: string[]): Promise<Rect | undefined> => {
      const target = await rectInTopWindow(page, frames, '#scroll-target');
      const box = await rectInTopWindow(page, frames.slice(0, -1), '#scroller', 'client');
      const x = Math.max(target.x, box.x);
      const y = Math.max(target.y, box.y);
      const right = Math.min(target.x + target.width, box.x + box.width);
      const bottom = Math.min(target.y + target.height, box.y + box.height);
      if (right <= x || bottom <= y) {
        return undefined;
      }
      return { x, y, width: right - x, height: bottom - y };
    };

    const expectSpotlightOnVisiblePart = (page: Page, frames: string[]) =>
      expect
        .poll(
          async () => {
            const hole = await page.locator('.usertour-widget-spotlight').boundingBox();
            const visible = await visiblePart(page, frames);
            if (!hole || !visible) {
              return `hole=${JSON.stringify(hole)} visible=${JSON.stringify(visible)}`;
            }
            const edges = (rect: Rect) => [
              rect.x,
              rect.y,
              rect.x + rect.width,
              rect.y + rect.height,
            ];
            const visibleEdges = edges(visible);
            const off = edges(hole).map((edge, index) => Math.abs(edge - visibleEdges[index]));
            const describe = (rect: Rect) =>
              `x ${rect.x.toFixed(1)}–${(rect.x + rect.width).toFixed(1)} y ${rect.y.toFixed(1)}–${(rect.y + rect.height).toFixed(1)}`;
            return Math.max(...off) <= 1
              ? 'on the visible part'
              : `hole ${describe(hole)}, visible ${describe(visible)}`;
          },
          { message: 'the spotlight opens on exactly the part of the target the box shows' },
        )
        .toBe('on the visible part');

    for (const container of CONTAINERS) {
      for (const scenario of SCENARIOS) {
        test(`${container.name}, target ${scenario.name}`, async ({ sdk, protocol }) => {
          await start(sdk);
          // Opening a step scrolls its target into the box; keep the row's scroll position.
          await sdk.page.evaluate(() => window.usertour?.setCustomScrollIntoView?.(() => {}));
          await container.mount(sdk.page);
          await scrollBox(sdk.page, container.frames, scenario.scrollTop);
          await protocol.push('SetFlowSession', spotlightFlow());

          if (scenario.expected === 'shown') {
            await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
            await expectSpotlightOnVisiblePart(sdk.page, container.frames);
            // Still shown past the theme's tolerance (3s) that would end the flow.
            await sdk.advance(4_000);
            await expect(sdk.surface).toBeVisible();
            expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
          } else {
            // Scrolled out of view is not missing: hidden past the tolerance,
            // and back with its spotlight once the target is scrolled back.
            await sdk.advance(4_000);
            await sdk.page.waitForTimeout(200);
            await expect(sdk.surface).toBeHidden();
            expect(protocol.messages('EndContent')).toHaveLength(0);
            await scrollBox(sdk.page, container.frames, 250);
            await sdk.advance(400);
            await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
            await expectSpotlightOnVisiblePart(sdk.page, container.frames);
          }
        });
      }
    }
  });

  test.describe('with the SDK’s own page embedded in a same-origin frame', () => {
    /**
     * Load the portal, whose frame holds the runtime host, then install and
     * start the SDK inside that frame — the SDK's window is not the top one.
     */
    const openSdkInFrame = async (page: Page, protocol: ProtocolServer): Promise<Frame> => {
      protocol.reset();
      await page.addInitScript(
        ({ wsUri, assetsUri }) => {
          window.USERTOURJS_ENV_VARS = { WS_URI: wsUri, ASSETS_URI: assetsUri };
        },
        { wsUri: protocol.url, assetsUri: `${RUNTIME_HOST_URL}/sdk-dist` },
      );
      await page.clock.install();
      await page.goto(`${RUNTIME_HOST_URL}/frame-portal.html`);
      const app = page.frame({ url: /\/runtime\.html/ });
      if (!app) {
        throw new Error('the portal did not load the runtime host in its frame');
      }
      await app.addScriptTag({ type: 'module', url: SDK_BUNDLE_URL });
      await expect
        .poll(() => app.evaluate(() => Boolean(window.usertour && !window.usertour._stubbed)))
        .toBe(true);
      await app.evaluate(async () => {
        await window.usertour?.init('env-token');
        await window.usertour?.identify('u1');
      });
      return app;
    };

    const surfaceIn = (app: Frame) => app.locator('[data-usertour-popper-content-wrapper]');
    const stepIn = (app: Frame) =>
      app.frameLocator('iframe.usertour-widget-surface-viewport').getByText('Click here to begin');

    test('a tooltip on an element of the SDK’s own page is clipped in that page, not the portal', async ({
      page,
      protocol,
    }) => {
      const app = await openSdkInFrame(page, protocol);
      await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#cta'));
      await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

      await expect(stepIn(app)).toBeVisible();
      await expectAttachedBelow(page, surfaceIn(app), ['app'], '#cta');
      await page.clock.runFor(4_000);
      await expect(surfaceIn(app)).toBeVisible();
      expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
      expect(protocol.messages('EndContent')).toHaveLength(0);
    });

    test('a target in a frame of that page carries that frame’s offset only', async ({
      page,
      protocol,
    }) => {
      const app = await openSdkInFrame(page, protocol);
      await mountFrame(
        app,
        { id: 'activity', src: '/frame-activity.html' },
        { left: 40, top: 0, width: 640, height: 360 },
      );
      await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#activity-submit'));
      await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

      await expect(stepIn(app)).toBeVisible();
      await expectAttachedBelow(page, surfaceIn(app), ['app', 'activity']);
      await page.clock.runFor(4_000);
      await expect(surfaceIn(app)).toBeVisible();
      expect(protocol.messages('ReportTooltipTargetMissing')).toHaveLength(0);
      expect(protocol.messages('EndContent')).toHaveLength(0);
    });
  });
});
