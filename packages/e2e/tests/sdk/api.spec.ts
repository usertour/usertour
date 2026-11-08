import type { Page } from '@playwright/test';
import {
  bannerSession,
  button,
  checklistSession,
  dismissFlow,
  evaluateJs,
  launcherSession,
  link,
  modalFlow,
  navigate,
  resourceCenterSession,
  richText,
  row,
  twoStepFlow,
} from './content';
import { RUNTIME_HOST_URL, type SdkPage, expect, test } from './fixtures';
import type { ProtocolServer } from './protocol-server';

/**
 * The public API a host page calls on `window.usertour`, beyond the identity
 * and attribute writes in identity.spec.ts: starting content, the state
 * queries, `reset`, the configuration setters and the resource center's
 * controls. Each one is a contract with customers' code, so each is checked
 * from the call to what the server or the page ends up with.
 *
 * Setters that take a function are called through `page.evaluate`: a function
 * cannot cross into the page as an argument of `sdk.call`.
 */

const start = async (sdk: SdkPage) => {
  await sdk.init();
  await sdk.identify('u1');
};

const isStarted = (sdk: SdkPage, contentIds: string[]) =>
  Promise.all(contentIds.map((contentId) => sdk.isStarted(contentId)));

const isIdentified = (page: Page) => page.evaluate(() => Boolean(window.usertour?.isIdentified()));

/** What the page shows for each content type, by the element each one mounts. */
const widgets = (page: Page) => ({
  banner: page.locator('iframe.usertour-widget-banner-frame'),
  checklist: page.locator('iframe.usertour-widget-checklist-launcher'),
  launcher: page.locator('.usertour-widget-launcher'),
  resourceCenter: page.locator('iframe.usertour-widget-resource-center-frame'),
});

/** Push one of each content type and wait until every one is on screen. */
const pushEverything = async (sdk: SdkPage, protocol: ProtocolServer) => {
  await protocol.push(
    'SetChecklistSession',
    checklistSession({
      sessionId: 'checklist-session-1',
      contentId: 'checklist-1',
      tasks: [{ id: 'invite', name: 'Invite your team' }],
      expanded: false,
    }),
  );
  await protocol.push(
    'SetBannerSession',
    bannerSession({ sessionId: 'banner-session-1', contentId: 'banner-1', text: 'Maintenance' }),
  );
  await protocol.push(
    'AddLauncher',
    launcherSession({
      sessionId: 'launcher-session-1',
      contentId: 'launcher-1',
      target: '#cta',
      text: 'Start here',
    }),
  );
  await protocol.push(
    'SetResourceCenterSession',
    resourceCenterSession({ sessionId: 'rc-session-1', contentId: 'rc-1', actions: [] }),
  );
  await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
  const on = widgets(sdk.page);
  await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
  await expect(on.banner).toBeVisible();
  await expect(on.checklist).toBeVisible();
  await expect(on.launcher).toBeVisible();
  await expect(on.resourceCenter).toBeVisible();
};

const EVERYTHING = ['flow-1', 'checklist-1', 'banner-1', 'launcher-1', 'rc-1'];

const expectNothingOnScreen = async (sdk: SdkPage) => {
  const on = widgets(sdk.page);
  await expect(sdk.surface).toHaveCount(0);
  await expect(on.banner).toHaveCount(0);
  await expect(on.checklist).toHaveCount(0);
  await expect(on.launcher).toHaveCount(0);
  await expect(on.resourceCenter).toHaveCount(0);
};

test.describe('init()', () => {
  test('calls before init() are refused, and init() refuses an empty token', async ({
    sdk,
    protocol,
  }) => {
    expect(await sdk.identify('u1')).toEqual({
      ok: false,
      error: 'You must call usertour.init() first',
    });
    expect(await sdk.init('')).toMatchObject({
      ok: false,
      error: expect.stringContaining('missing Usertour.js token'),
    });
    expect(protocol.attempts).toHaveLength(0);
  });

  test('init() with another token ends the first environment’s session without a report', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
    const first = protocol.live()[0];

    await sdk.init('other-token');
    await expect(sdk.surface).toHaveCount(0);
    await protocol.waitForDisconnect(first);
    expect(await sdk.isStarted('flow-1')).toBe(false);

    await sdk.identify('u1');
    await protocol.waitForConnections(2);
    expect(protocol.connections[1].auth).toMatchObject({ token: 'other-token' });
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });
});

test.describe('identity', () => {
  test('identifying another user removes the first user’s content without ending it', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await pushEverything(sdk, protocol);

    await sdk.identify('u2');
    await expectNothingOnScreen(sdk);
    expect(await isStarted(sdk, EVERYTHING)).toEqual(EVERYTHING.map(() => false));
    await protocol.waitForConnections(2);
    expect(protocol.connections[1].auth).toMatchObject({ externalUserId: 'u2' });
    expect(protocol.messages('EndContent')).toHaveLength(0);
  });

  test('reset() removes every widget and forgets the user and its attributes', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1', { plan: 'pro' });
    await pushEverything(sdk, protocol);

    await sdk.reset();
    await expectNothingOnScreen(sdk);
    expect(await isStarted(sdk, EVERYTHING)).toEqual(EVERYTHING.map(() => false));
    expect(await isIdentified(sdk.page)).toBe(false);
    expect(protocol.messages('EndContent')).toHaveLength(0);

    // The same user again: a value it had before reset() is not "unchanged".
    await sdk.identify('u1');
    await protocol.waitForMessages('UpsertUser', 2);
    await sdk.updateUser({ plan: 'pro' });
    await protocol.waitForMessages('UpsertUser', 3);
    expect(protocol.messages('UpsertUser')[2].message.payload).toMatchObject({
      externalUserId: 'u1',
      attributes: { plan: 'pro' },
    });
  });

  test('isIdentified() follows identify() and reset()', async ({ sdk, page }) => {
    await sdk.init();
    expect(await isIdentified(page)).toBe(false);
    await sdk.identify('u1');
    expect(await isIdentified(page)).toBe(true);
    await sdk.reset();
    expect(await isIdentified(page)).toBe(false);
  });

  test.describe('identifyAnonymous()', () => {
    const KEY = 'USERTOUR@0.0.1/identify-anonymous';
    const storedId = (page: Page) =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw).value?.userId as string) : undefined;
      }, KEY);
    const upsertedIds = (protocol: ProtocolServer) =>
      protocol
        .messages('UpsertUser')
        .map((seen) => (seen.message.payload as { externalUserId: string }).externalUserId);

    test('mints an anonymous id and keeps it in this browser', async ({ sdk, protocol, page }) => {
      await sdk.init();
      expect((await sdk.call('identifyAnonymous')).ok).toBe(true);
      await protocol.waitForMessages('UpsertUser', 1);
      const [userId] = upsertedIds(protocol);
      expect(userId).toMatch(/^anon-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(protocol.connections[0].auth).toMatchObject({ externalUserId: userId });
      expect(await storedId(page)).toBe(userId);

      expect((await sdk.call('identifyAnonymous')).ok).toBe(true);
      await protocol.waitForMessages('UpsertUser', 2);
      expect(upsertedIds(protocol)).toEqual([userId, userId]);
    });

    test('reuses the id this browser stored, prefixing one stored without `anon-`', async ({
      sdk,
      protocol,
      page,
    }) => {
      const uuid = '0f8c2a52-6c1e-4e8e-9d3b-7a1f2b3c4d5e';
      // An id minted before the prefix existed, in the storage format the SDK writes.
      await page.evaluate(
        ({ key, uuid }) =>
          localStorage.setItem(
            key,
            JSON.stringify({ value: { userId: uuid }, time: Date.now(), expire: -1 }),
          ),
        { key: KEY, uuid },
      );
      await sdk.init();
      expect((await sdk.call('identifyAnonymous')).ok).toBe(true);
      await protocol.waitForMessages('UpsertUser', 1);
      expect(upsertedIds(protocol)).toEqual([`anon-${uuid}`]);
      expect(await storedId(page)).toBe(`anon-${uuid}`);
    });
  });
});

test.describe('starting content', () => {
  test('start() asks the server to start the content, at a step when given', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    expect(await sdk.call('start', 'flow-9')).toEqual({
      ok: false,
      error: 'You must call usertour.identify() first',
    });

    await sdk.identify('u1');
    expect((await sdk.call('start', 'flow-9', { cvid: 'flow-9-cvid-3', once: true })).ok).toBe(
      true,
    );
    await protocol.waitForMessages('StartContent', 1);
    expect(protocol.messages('StartContent')[0].message.payload).toEqual({
      contentId: 'flow-9',
      stepCvid: 'flow-9-cvid-3',
      once: true,
      startReason: 'start_from_program',
    });
  });

  test('navigating to a URL with ?usertour=<id> starts that content and drops the parameter', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    await page.evaluate(() =>
      history.pushState({}, '', `${location.pathname}${location.search}&usertour=flow-9`),
    );
    await sdk.advance(600);
    await protocol.waitForMessages('StartContent', 1);
    expect(protocol.messages('StartContent')[0].message.payload).toEqual({
      contentId: 'flow-9',
      startReason: 'start_from_url',
    });
    await expect.poll(() => page.evaluate(() => location.search)).toBe('?usertour_debug=1');
  });

  test.describe('on a page opened with ?usertour=<id>', () => {
    test.use({ hostQuery: 'usertour=flow-9' });

    test('the content starts once the user is identified, and only once', async ({
      sdk,
      protocol,
      page,
    }) => {
      await start(sdk);
      await protocol.waitForMessages('StartContent', 1);
      expect(protocol.messages('StartContent')[0].message.payload).toEqual({
        contentId: 'flow-9',
        startReason: 'start_from_url',
      });
      await expect.poll(() => page.evaluate(() => location.search)).toBe('?usertour_debug=1');

      // Removing the parameter is a URL change of its own; it starts nothing.
      await sdk.advance(1_000);
      await page.waitForTimeout(200);
      expect(protocol.messages('StartContent')).toHaveLength(1);
    });
  });

  test('isStarted() is true for each kind of content on screen, and false once it goes', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await pushEverything(sdk, protocol);
    expect(await isStarted(sdk, EVERYTHING)).toEqual(EVERYTHING.map(() => true));

    await protocol.push('UnsetFlowSession', { sessionId: 'session-1' });
    await protocol.push('UnsetChecklistSession', { sessionId: 'checklist-session-1' });
    await protocol.push('UnsetBannerSession', { sessionId: 'banner-session-1' });
    await protocol.push('RemoveLauncher', { contentId: 'launcher-1' });
    await protocol.push('UnsetResourceCenterSession', { sessionId: 'rc-session-1' });
    await expectNothingOnScreen(sdk);
    expect(await isStarted(sdk, EVERYTHING)).toEqual(EVERYTHING.map(() => false));
  });
});

test.describe('setUrlFilter()', () => {
  test.use({ hostQuery: 'token=secret' });

  const hideToken = (page: Page) =>
    page.evaluate(() =>
      window.usertour?.setUrlFilter((url: string) => url.replace(/token=[^&]*/, 'token=hidden')),
    );

  const reportedUrls = (protocol: ProtocolServer) =>
    protocol
      .messages('UpdateClientContext')
      .map((seen) => (seen.message.payload as { pageUrl: string }).pageUrl);

  test('the server sees the filtered URL, and a change only in what is filtered out is not reported', async ({
    sdk,
    protocol,
    page,
  }) => {
    await sdk.init();
    await hideToken(page);
    await sdk.identify('u1');
    expect(protocol.connections[0].auth).toMatchObject({
      clientContext: {
        pageUrl: `${RUNTIME_HOST_URL}/runtime.html?usertour_debug=1&token=hidden`,
      },
    });

    await page.evaluate(() => history.pushState({}, '', '?usertour_debug=1&token=rotated'));
    await sdk.advance(1_000);
    await page.waitForTimeout(200);
    expect(reportedUrls(protocol)).toEqual([]);

    await page.evaluate(() => history.pushState({}, '', '?usertour_debug=1&token=rotated&page=2'));
    await sdk.advance(600);
    await protocol.waitForMessages('UpdateClientContext', 1);
    expect(reportedUrls(protocol)).toEqual([
      `${RUNTIME_HOST_URL}/runtime.html?usertour_debug=1&token=hidden&page=2`,
    ]);
  });

  test('set after identify(), it sends the filtered URL at once', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    await hideToken(page);
    await protocol.waitForMessages('UpdateClientContext', 1);
    expect(reportedUrls(protocol)).toEqual([
      `${RUNTIME_HOST_URL}/runtime.html?usertour_debug=1&token=hidden`,
    ]);
  });
});

test.describe('links and navigation', () => {
  const docs = 'https://example.com/docs';

  test('a page-navigate action opens the URL, decorated by setLinkUrlDecorator(), in this tab', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    const opened = await sdk.stubNavigation();
    await page.evaluate(() =>
      window.usertour?.setLinkUrlDecorator((url: string) => `${url}?ref=tour`),
    );
    await protocol.push(
      'SetFlowSession',
      modalFlow('session-1', 'flow-1', [row(button('Open the docs', [navigate(docs)]))]),
    );
    await sdk.frame().getByRole('button', { name: 'Open the docs' }).click();
    await expect.poll(opened).toEqual([{ url: `${docs}?ref=tour`, target: '_self' }]);
  });

  test('setCustomNavigate() takes same-tab navigation; a new tab still opens in the browser', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    const opened = await sdk.stubNavigation();
    await page.evaluate(() =>
      window.usertour?.setCustomNavigate((url: string) => {
        window.__usertourRecorded.navigated = [...(window.__usertourRecorded.navigated ?? []), url];
      }),
    );
    const navigated = () => sdk.recorded('navigated');
    await protocol.push(
      'SetFlowSession',
      modalFlow('session-1', 'flow-1', [
        row(button('Same tab', [navigate(`${docs}/same`)])),
        row(button('New tab', [navigate(`${docs}/new`, 'new')])),
      ]),
    );

    await sdk.frame().getByRole('button', { name: 'Same tab' }).click();
    await expect.poll(navigated).toEqual([`${docs}/same`]);
    expect(await opened()).toEqual([]);

    await sdk.frame().getByRole('button', { name: 'New tab' }).click();
    await expect.poll(opened).toEqual([{ url: `${docs}/new`, target: '_blank' }]);
    expect(await navigated()).toEqual([`${docs}/same`]);
  });

  test('setLinkUrlDecorator() also decorates links in the content', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    await page.evaluate(() =>
      window.usertour?.setLinkUrlDecorator((url: string) => `${url}?ref=tour`),
    );
    await protocol.push(
      'SetFlowSession',
      modalFlow('session-1', 'flow-1', [row(richText({ text: 'Read ' }, link('the guide', docs)))]),
    );
    await expect(sdk.frame().getByRole('link', { name: 'the guide' })).toHaveAttribute(
      'href',
      `${docs}?ref=tour`,
    );
  });
});

test.describe('JavaScript actions', () => {
  const RUN = "window.__usertourRecorded.ran = ['yes']";

  test('a JavaScript action runs its code', async ({ sdk, protocol }) => {
    await start(sdk);
    await protocol.push(
      'SetFlowSession',
      modalFlow('session-1', 'flow-1', [row(button('Run it', [evaluateJs(RUN)]))]),
    );
    await sdk.frame().getByRole('button', { name: 'Run it' }).click();
    await expect.poll(() => sdk.recorded('ran')).toEqual(['yes']);
  });

  test('after disableEvalJs() it is skipped with a warning; the other actions still run', async ({
    sdk,
    protocol,
  }) => {
    await start(sdk);
    await sdk.call('disableEvalJs');
    await protocol.push(
      'SetFlowSession',
      modalFlow('session-1', 'flow-1', [row(button('Run it', [evaluateJs(RUN), dismissFlow()]))]),
    );
    await sdk.frame().getByRole('button', { name: 'Run it' }).click();
    await protocol.waitForMessages('EndContent', 1);
    expect(await sdk.recorded('ran')).toEqual([]);
    expect(await sdk.logLines(/JavaScript evaluation is disabled/)).toHaveLength(1);
  });
});

test.describe('registerCustomInput()', () => {
  const textInputIs = (selector: string, value: string) => ({
    id: `text-input-is:${selector}`,
    type: 'text-input',
    operators: 'and',
    data: {
      logic: 'is',
      value,
      elementData: { type: 'manual', customSelector: selector, sequence: '1st' },
    },
  });

  test('text-input conditions read a registered element, by its getter or its text', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    await page.evaluate(() => {
      const add = (className: string, text: string, value?: string) => {
        const element = document.createElement('div');
        element.className = className;
        element.textContent = text;
        if (value) {
          element.dataset.value = value;
        }
        document.body.appendChild(element);
      };
      add('plan-picker', 'Pro plan', 'pro');
      add('size-picker', 'Large');
      add('unregistered', 'pro');
      window.usertour?.registerCustomInput(
        '.plan-picker',
        (element: HTMLElement) => element.dataset.value ?? '',
      );
      window.usertour?.registerCustomInput('.size-picker');
    });

    const conditions = [
      textInputIs('.plan-picker', 'pro'),
      textInputIs('.size-picker', 'Large'),
      textInputIs('.unregistered', 'pro'),
    ];
    for (const condition of conditions) {
      await protocol.push('TrackClientCondition', {
        contentId: 'flow-1',
        contentType: 'flow',
        versionId: 'version-1',
        condition,
      });
    }
    const reported = () =>
      Object.fromEntries(
        protocol
          .messages('ToggleClientCondition')
          .map((seen) => seen.message.payload as { conditionId: string; isActive: boolean })
          .map((payload) => [payload.conditionId, payload.isActive]),
      );
    await expect.poll(reported).toEqual({
      'text-input-is:.plan-picker': true,
      'text-input-is:.size-picker': true,
      'text-input-is:.unregistered': false,
    });
  });
});

test.describe('stacking and scrolling', () => {
  test('setBaseZIndex() moves the stacking level the widgets are drawn at', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    await sdk.call('setBaseZIndex', 5000);
    await protocol.push(
      'AddLauncher',
      launcherSession({
        sessionId: 'launcher-session-1',
        contentId: 'launcher-1',
        target: '#cta',
        text: 'Start here',
      }),
    );
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    await expect(sdk.frame().getByText('Welcome aboard')).toBeVisible();
    await expect(widgets(page).launcher).toBeVisible();

    // A flow is drawn 200 above the base (a modal's panel one higher still);
    // a launcher at the base.
    await expect(page.locator('.usertour-widget-surface')).toHaveCSS('z-index', '5201');
    await expect(widgets(page).launcher).toHaveCSS('z-index', '5000');
  });

  test('setCustomScrollIntoView() is handed the target instead of the page scrolling to it', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.height = '3000px';
      const target = document.createElement('button');
      target.id = 'far-target';
      target.textContent = 'Far away';
      document.body.append(spacer, target);
      window.usertour?.setCustomScrollIntoView((element: Element) => {
        window.__usertourRecorded.scrolledTo = [
          ...(window.__usertourRecorded.scrolledTo ?? []),
          element.id,
        ];
      });
    });
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#far-target'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    await expect.poll(() => sdk.recorded('scrolledTo')).toEqual(['far-target']);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test.describe('setTargetMissingSeconds()', () => {
  test('sets how long a tooltip waits for its target, over the theme’s tolerance', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    expect(await sdk.call('setTargetMissingSeconds', 11)).toEqual({
      ok: false,
      error: 'Target missing time cannot exceed 10 seconds',
    });
    await sdk.call('setTargetMissingSeconds', 5);
    await sdk.pauseClock();
    await protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1', '#nowhere'));
    await protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });

    // The theme's tolerance (3s) has long passed; the 5s set here has not.
    await sdk.advance(4_800);
    await page.waitForTimeout(300);
    expect(protocol.messages('EndContent')).toHaveLength(0);

    await sdk.advance(400);
    await protocol.waitForMessages('EndContent', 1);
    expect(protocol.messages('EndContent')[0].message.payload).toMatchObject({
      sessionId: 'session-1',
      endReason: 'tooltip_target_missing',
    });
  });
});

test.describe('resource center controls', () => {
  const pushResourceCenter = (protocol: ProtocolServer) =>
    protocol.push(
      'SetResourceCenterSession',
      resourceCenterSession({ sessionId: 'rc-session-1', contentId: 'rc-1', actions: [] }),
    );
  const isOpen = (page: Page) =>
    page.evaluate(() => Boolean(window.usertour?.isResourceCenterOpen()));
  const panel = (sdk: SdkPage) =>
    sdk.page
      .frameLocator('iframe.usertour-widget-resource-center-frame')
      .getByText('How can we help?');

  test('open, close and toggle drive the panel and are reported', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    // With no resource center yet, the calls do nothing rather than fail.
    expect((await sdk.call('openResourceCenter')).ok).toBe(true);
    expect(await isOpen(page)).toBe(false);

    await pushResourceCenter(protocol);
    await expect(widgets(page).resourceCenter).toBeVisible();

    await sdk.call('openResourceCenter');
    await protocol.waitForMessages('OpenResourceCenter', 1);
    await expect(panel(sdk)).toBeVisible();
    expect(await isOpen(page)).toBe(true);

    await sdk.call('closeResourceCenter');
    await protocol.waitForMessages('CloseResourceCenter', 1);
    await expect(panel(sdk)).toBeHidden();
    expect(await isOpen(page)).toBe(false);

    await sdk.call('toggleResourceCenter');
    await protocol.waitForMessages('OpenResourceCenter', 2);
    expect(await isOpen(page)).toBe(true);
    await sdk.call('toggleResourceCenter');
    await protocol.waitForMessages('CloseResourceCenter', 2);
    expect(await isOpen(page)).toBe(false);
  });

  test('a launcher hidden before the resource center arrives stays hidden until shown again', async ({
    sdk,
    protocol,
    page,
  }) => {
    await start(sdk);
    await sdk.call('hideResourceCenterLauncher');
    await pushResourceCenter(protocol);
    await expect(widgets(page).resourceCenter).toBeAttached();
    await expect(widgets(page).resourceCenter).toBeHidden();

    // The panel itself still opens from code.
    await sdk.call('openResourceCenter');
    await expect(panel(sdk)).toBeVisible();
    await sdk.call('closeResourceCenter');
    await expect(widgets(page).resourceCenter).toBeHidden();

    await sdk.call('showResourceCenterLauncher');
    await expect(widgets(page).resourceCenter).toBeVisible();
  });
});
