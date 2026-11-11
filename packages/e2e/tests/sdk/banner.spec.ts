import {
  type BannerPlacement,
  bannerSession,
  button,
  dismissBanner,
  elementPresent,
  evaluateJs,
  inputEmpty,
  row,
} from './content';
import { type SdkPage, expect, test } from './fixtures';

/**
 * Where a banner goes and what it does with what the builder configures: the
 * bottom of the page, the four places around a container element, following
 * that container as it hides and returns, the dismiss button, its own
 * buttons, and a session the server updates in place.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

const SESSION = 'banner-session-1';

const banner = (overrides: Partial<Parameters<typeof bannerSession>[0]> = {}) =>
  bannerSession({
    sessionId: SESSION,
    contentId: 'banner-1',
    text: 'Maintenance tonight',
    ...overrides,
  });

/** The element the SDK puts in the page, holding the banner's frame. */
const mount = (sdk: SdkPage) => sdk.page.locator('.usertour-widget-banner');
const content = (sdk: SdkPage) => sdk.page.frameLocator('iframe.usertour-widget-banner-frame');

const setDisplay = (sdk: SdkPage, id: string, display: string) =>
  sdk.page.evaluate(
    ({ id, display }) => {
      (document.getElementById(id) as HTMLElement).style.display = display;
    },
    { id, display },
  );

const RUN = "window.__usertourRecorded.ran = ['yes']";

test.describe('placement', () => {
  test('at the bottom of the page, a banner comes after the page’s content', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetBannerSession', banner({ placement: 'bottom-of-page' }));
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    const place = await mount(sdk).evaluate((element) => ({
      inBody: element.parentElement === document.body,
      afterMain: Boolean(
        (document.querySelector('main')?.compareDocumentPosition(element) ?? 0) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    }));
    expect(place).toEqual({ inBody: true, afterMain: true });
    const mainBox = await sdk.page.locator('main').boundingBox();
    const bannerBox = await mount(sdk).boundingBox();
    expect(bannerBox?.y ?? 0).toBeGreaterThanOrEqual((mainBox?.y ?? 0) + (mainBox?.height ?? 0));
  });

  const AROUND_CONTAINER: Array<[BannerPlacement, string]> = [
    ['top-of-container-element', 'first in it'],
    ['bottom-of-container-element', 'last in it'],
    ['immediately-before-element', 'just before it'],
    ['immediately-after-element', 'just after it'],
  ];

  for (const [placement, expected] of AROUND_CONTAINER) {
    test(`placed ${placement}, a banner goes ${expected}`, async ({ sdk, protocol }) => {
      await start(sdk);
      await protocol.push('SetBannerSession', banner({ placement, container: '#panel' }));
      await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
      const where = await mount(sdk).evaluate((element) => {
        const panel = document.getElementById('panel');
        if (element.parentElement === panel) {
          if (panel?.firstElementChild === element) {
            return 'first in it';
          }
          return panel?.lastElementChild === element ? 'last in it' : 'inside it';
        }
        if (element.nextElementSibling === panel) {
          return 'just before it';
        }
        return element.previousElementSibling === panel ? 'just after it' : 'elsewhere';
      });
      expect(where).toBe(expected);
    });
  }

  // An empty element is a common anchor for a banner: it has no height until the
  // banner is put in it, and none at all when the banner goes beside it.
  for (const placement of [
    'immediately-before-element',
    'immediately-after-element',
    'top-of-container-element',
  ] as const) {
    test(`placed ${placement} an empty element, a banner shows and stays`, async ({
      sdk,
      protocol,
    }) => {
      await start(sdk);
      await sdk.page.evaluate(() => {
        const slot = document.createElement('div');
        slot.id = 'banner-slot';
        document.querySelector('main')?.prepend(slot);
      });
      await protocol.push('SetBannerSession', banner({ placement, container: '#banner-slot' }));
      await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();

      await sdk.advance(1000);
      await expect(mount(sdk)).toHaveCount(1);
      await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    });
  }

  test('a banner placed by a container leaves with it, gap and all, and returns with it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    // Just before the container, so a banner left behind would still take up room.
    await protocol.push(
      'SetBannerSession',
      banner({ placement: 'immediately-before-element', container: '#panel' }),
    );
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();

    await setDisplay(sdk, 'panel', 'none');
    await sdk.advance(400);
    await expect(mount(sdk)).toHaveCount(0);

    await setDisplay(sdk, 'panel', '');
    await sdk.advance(400);
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });
  test('a container the page re-renders gets the banner back, content and all', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetBannerSession', banner({ container: '#panel' }));
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();

    await sdk.page.evaluate(() => {
      const fresh = document.createElement('div');
      fresh.id = 'panel';
      fresh.textContent = 'Re-rendered panel';
      document.getElementById('panel')?.replaceWith(fresh);
    });
    await sdk.advance(600);
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    expect(await mount(sdk).evaluate((element) => element.parentElement?.textContent)).toContain(
      'Re-rendered panel',
    );
  });
});

test.describe('its buttons', () => {
  test('without user dismissal allowed, there is no dismiss button', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push('SetBannerSession', banner({ allowDismiss: false }));
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    await expect(content(sdk).getByRole('button', { name: 'Dismiss banner' })).toHaveCount(0);
  });

  test('a banner’s buttons run their actions and follow their rules as the page changes', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetBannerSession',
      banner({
        blocks: [
          row(
            button('Read more', [evaluateJs(RUN)]),
            button('Continue', [], { disableWhen: [inputEmpty('#email')] }),
            button('Skip for now', [], { hideWhen: [elementPresent('#secondary')] }),
          ),
        ],
      }),
    );
    const next = content(sdk).getByRole('button', { name: 'Continue' });
    const skip = content(sdk).getByRole('button', { name: 'Skip for now' });
    await expect(next).toBeDisabled();
    await expect(skip).toHaveCount(0);

    await content(sdk).getByRole('button', { name: 'Read more' }).click();
    await expect.poll(() => sdk.recorded('ran')).toEqual(['yes']);

    await sdk.page.fill('#email', 'ada@example.com');
    await sdk.advance(400);
    await expect(next).toBeEnabled();
    await sdk.page.evaluate(() => document.getElementById('secondary')?.remove());
    await sdk.advance(400);
    await expect(skip).toBeVisible();
  });

  test('a dismiss action ends the banner with action_dismiss', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetBannerSession',
      banner({ blocks: [row(button('Got it', [dismissBanner()]))] }),
    );
    await content(sdk).getByRole('button', { name: 'Got it' }).click();
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toEqual({
      sessionId: SESSION,
      endReason: 'action_dismiss',
    });
    await expect(mount(sdk)).toHaveCount(0);
  });
});

test.describe('a session updated in place', () => {
  test('takes the new text and moves to the new placement, still one banner', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetBannerSession', banner());
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();

    await protocol.push(
      'SetBannerSession',
      banner({ text: 'Maintenance moved to Friday', placement: 'bottom-of-page' }),
    );
    await expect(content(sdk).getByText('Maintenance moved to Friday')).toBeVisible();
    await expect(content(sdk).getByText('Maintenance tonight')).toHaveCount(0);
    await expect(mount(sdk)).toHaveCount(1);
    expect(
      await mount(sdk).evaluate((element) =>
        Boolean(
          (document.querySelector('main')?.compareDocumentPosition(element) ?? 0) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
    ).toBe(true);
  });

  test('moved off a hidden container to the top of the page, a banner shows again', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push(
      'SetBannerSession',
      banner({ placement: 'immediately-before-element', container: '#panel' }),
    );
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    await setDisplay(sdk, 'panel', 'none');
    await sdk.advance(400);
    await expect(mount(sdk)).toHaveCount(0);

    await protocol.push('SetBannerSession', banner({ placement: 'top-of-page' }));
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    expect(
      await mount(sdk).evaluate((element) => document.body.firstElementChild === element),
    ).toBe(true);
  });
});

test.describe('sticky and overlay', () => {
  const addSpacer = (sdk: SdkPage) =>
    sdk.page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.height = '3000px';
      document.body.appendChild(spacer);
    });
  const headingY = async (sdk: SdkPage) =>
    (await sdk.page.getByRole('heading', { name: 'Runtime host' }).boundingBox())?.y ?? -1;

  test('a sticky banner stays at the top of the viewport while the page scrolls', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await addSpacer(sdk);
    await protocol.push('SetBannerSession', banner({ sticky: true }));
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    await expect(mount(sdk)).toHaveCSS('position', 'sticky');
    const pushedHeading = await headingY(sdk);

    await sdk.page.evaluate(() => window.scrollTo(0, 500));
    expect((await mount(sdk).boundingBox())?.y).toBe(0);
    expect(await headingY(sdk)).toBeLessThan(pushedHeading);
  });

  test('an overlay banner floats over the page without pushing it down', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    const headingBefore = await headingY(sdk);
    await protocol.push('SetBannerSession', banner({ overlay: true }));
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    await expect(mount(sdk)).toHaveCSS('position', 'absolute');
    expect((await mount(sdk).boundingBox())?.y).toBe(0);
    expect(await headingY(sdk)).toBe(headingBefore);
  });

  test('sticky and overlay together pin the banner to the viewport', async ({ sdk, protocol }) => {
    await start(sdk);
    await addSpacer(sdk);
    await protocol.push('SetBannerSession', banner({ sticky: true, overlay: true }));
    await expect(content(sdk).getByText('Maintenance tonight')).toBeVisible();
    await expect(mount(sdk)).toHaveCSS('position', 'fixed');
    await sdk.page.evaluate(() => window.scrollTo(0, 500));
    expect((await mount(sdk).boundingBox())?.y).toBe(0);
  });
});
