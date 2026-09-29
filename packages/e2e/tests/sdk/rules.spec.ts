import { expect, test } from './fixtures';

/**
 * The rules the SDK evaluates in the browser, as the server sees their
 * outcome: element, text-input and text-fill conditions the server asks the
 * page to track (`TrackClientCondition` → `ToggleClientCondition`), wait
 * timers (`StartConditionWaitTimer` → `FireConditionWaitTimer`), the page
 * URL the URL monitor reports (`UpdateClientContext`), and the tracker rules
 * evaluated entirely on the client (`AddTracker` → `TrackTrackerEvent`).
 *
 * The conditions monitor polls once a second and the URL monitor twice a
 * second, both on the page clock: `sdk.advance(1_000)` is one poll.
 */

const CONTENT = { contentId: 'flow-1', contentType: 'flow', versionId: 'version-1' };
let ruleSeq = 0;
const ruleId = () => `rule-${ruleSeq++}`;

const manual = (customSelector: string) => ({
  type: 'manual',
  customSelector,
  sequence: '1st',
  precision: 'loose',
});
const elementRule = (selector: string, logic: string) => ({
  id: ruleId(),
  type: 'element',
  operators: 'and',
  data: { logic, elementData: manual(selector) },
});
const textInputRule = (selector: string, logic: string, value?: string) => ({
  id: ruleId(),
  type: 'text-input',
  operators: 'and',
  data: { logic, value, elementData: manual(selector) },
});
const textFillRule = (selector: string) => ({
  id: ruleId(),
  type: 'text-fill',
  operators: 'and',
  data: { elementData: manual(selector) },
});

test.describe('client-evaluated conditions', () => {
  const setup = async (sdk: {
    init: () => Promise<unknown>;
    identify: (id: string) => Promise<unknown>;
  }) => {
    await sdk.init();
    await sdk.identify('u1');
  };

  /** Ask the page to track one condition and return its reports, newest last. */
  const track = async (
    protocol: {
      push: (kind: string, payload: unknown) => Promise<unknown>;
      messages: (kind: string) => any[];
    },
    condition: { id: string },
  ) => {
    await protocol.push('TrackClientCondition', { ...CONTENT, condition });
    return () =>
      protocol
        .messages('ToggleClientCondition')
        .filter((seen) => seen.message.payload?.conditionId === condition.id)
        .map(
          (seen) =>
            seen.message.payload as { isActive: boolean; contentId: string; versionId: string },
        );
  };

  test('element present: reported at once, and again when the element goes away', async ({
    sdk,
    protocol,
  }) => {
    await setup(sdk);
    const rule = elementRule('#cta', 'present');
    const reports = await track(protocol, rule);
    await expect.poll(() => reports().length).toBe(1);
    expect(reports()[0]).toMatchObject({ ...CONTENT, isActive: true });

    await sdk.page.evaluate(() => document.querySelector('#cta')?.remove());
    await sdk.advance(1_000);
    await expect.poll(() => reports().length).toBe(2);
    expect(reports()[1].isActive).toBe(false);
  });

  test('element unpresent: true for a missing element, false once it appears', async ({
    sdk,
    protocol,
  }) => {
    await setup(sdk);
    const reports = await track(protocol, elementRule('#later', 'unpresent'));
    await expect.poll(() => reports().length).toBe(1);
    expect(reports()[0].isActive).toBe(true);

    await sdk.page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'later';
      button.textContent = 'Later';
      document.body.append(button);
    });
    await sdk.advance(1_000);
    await expect.poll(() => reports().length).toBe(2);
    expect(reports()[1].isActive).toBe(false);
  });

  test('element disabled and undisabled follow the disabled attribute', async ({
    sdk,
    protocol,
  }) => {
    await setup(sdk);
    const disabled = await track(protocol, elementRule('#secondary', 'disabled'));
    const undisabled = await track(protocol, elementRule('#cta', 'undisabled'));
    await expect.poll(() => disabled().length + undisabled().length).toBe(2);
    expect(disabled()[0].isActive).toBe(true);
    expect(undisabled()[0].isActive).toBe(true);

    await sdk.page.evaluate(() => {
      (document.querySelector('#secondary') as HTMLButtonElement).disabled = false;
    });
    await sdk.advance(1_000);
    await expect.poll(() => disabled().length).toBe(2);
    expect(disabled()[1].isActive).toBe(false);
  });

  test('element clicked latches on a click; unclicked is the opposite', async ({
    sdk,
    protocol,
  }) => {
    await setup(sdk);
    const clicked = await track(protocol, elementRule('#cta', 'clicked'));
    const unclicked = await track(protocol, elementRule('#cta', 'unclicked'));
    await expect.poll(() => clicked().length + unclicked().length).toBe(2);
    expect(clicked()[0].isActive).toBe(false);
    expect(unclicked()[0].isActive).toBe(true);

    await sdk.page.click('#cta');
    await sdk.advance(1_000);
    await expect.poll(() => clicked().length + unclicked().length).toBe(4);
    expect(clicked()[1].isActive).toBe(true);
    expect(unclicked()[1].isActive).toBe(false);
  });

  for (const [logic, value, before, after] of [
    ['is', 'ada@example.com', 'ada@example.com', 'bob@example.com'],
    ['not', 'ada@example.com', 'bob@example.com', 'ada@example.com'],
    ['contains', '@example', 'ada@example.com', 'ada@other.io'],
    ['notContain', '@example', 'ada@other.io', 'ada@example.com'],
    ['startsWith', 'ada', 'ada@example.com', 'bob@example.com'],
    ['endsWith', '.io', 'ada@other.io', 'ada@example.com'],
    ['match', '^[a-z]+@', 'ada@example.com', '123@example.com'],
    ['unmatch', '^[a-z]+@', '123@example.com', 'ada@example.com'],
    ['empty', undefined, '', 'x'],
  ] as const) {
    test(`text-input ${logic}: true for "${before}", false for "${after}"`, async ({
      sdk,
      protocol,
    }) => {
      await setup(sdk);
      await sdk.page.fill('#email', before);
      const reports = await track(protocol, textInputRule('#email', logic, value));
      await expect.poll(() => reports().length).toBe(1);
      expect(reports()[0].isActive).toBe(true);

      await sdk.page.fill('#email', after);
      await sdk.advance(1_000);
      await expect.poll(() => reports().length).toBe(2);
      expect(reports()[1].isActive).toBe(false);
    });
  }

  // FINDING: text-input `any` is true whenever the input exists, empty or not
  // (usertour-rules-evaluator.ts isActiveRulesByTextInput), while the same
  // operator on an attribute means "has a non-empty value". Pinned as the
  // attribute semantics; fixme until the evaluator is aligned.
  test.fixme(
    'text-input any: true for a filled input, false once it is cleared',
    async ({ sdk, protocol }) => {
      await setup(sdk);
      await sdk.page.fill('#email', 'x');
      const reports = await track(protocol, textInputRule('#email', 'any'));
      await expect.poll(() => reports().length).toBe(1);
      expect(reports()[0].isActive).toBe(true);
      await sdk.page.fill('#email', '');
      await sdk.advance(1_000);
      await expect.poll(() => reports().length).toBe(2);
      expect(reports()[1].isActive).toBe(false);
    },
  );

  test('text-fill: true once the user typed something new and paused for a second', async ({
    sdk,
    protocol,
  }) => {
    await setup(sdk);
    const reports = await track(protocol, textFillRule('#email'));
    await expect.poll(() => reports().length).toBe(1);
    expect(reports()[0].isActive).toBe(false);

    await sdk.page.fill('#email', 'ada@example.com');
    // Still typing: less than a second since the last keystroke.
    await sdk.advance(500);
    await sdk.page.waitForTimeout(100);
    expect(reports()).toHaveLength(1);
    await sdk.advance(1_000);
    await expect.poll(() => reports().length).toBe(2);
    expect(reports()[1].isActive).toBe(true);
  });

  test('an untracked condition is not reported again', async ({ sdk, protocol }) => {
    await setup(sdk);
    const rule = elementRule('#cta', 'present');
    const reports = await track(protocol, rule);
    await expect.poll(() => reports().length).toBe(1);

    await protocol.push('UntrackClientCondition', { conditionId: rule.id });
    await sdk.page.evaluate(() => document.querySelector('#cta')?.remove());
    await sdk.advance(3_000);
    await sdk.page.waitForTimeout(200);
    expect(reports()).toHaveLength(1);
  });

  // Regression: the handshake carries the conditions from the credentials
  // snapshot, which the core refreshed after a server message and after a
  // wait timer fired — but not after a condition toggled. A reconnect then
  // told the server the condition was inactive although the page had
  // reported it active, and since the monitor reports changes only, the
  // server never learned otherwise until the element toggled again. The
  // toggle handler syncs the credentials now, as the wait-timer one does.
  test('the tracked conditions and their state ride the reconnect handshake', async ({
    sdk,
    protocol,
  }) => {
    await setup(sdk);
    const rule = elementRule('#cta', 'present');
    const reports = await track(protocol, rule);
    await expect.poll(() => reports().length).toBe(1);

    protocol.dropTransport();
    await protocol.waitForDisconnect(protocol.connections[0]);
    await sdk.advance(3_000);
    await protocol.waitForConnections(2);
    expect(protocol.connections[1].auth.clientConditions).toEqual([
      expect.objectContaining({ ...CONTENT, conditionId: rule.id, isActive: true }),
    ]);
  });
});

test.describe('wait timers', () => {
  test('fires after its wait, once, and is remembered as fired on reconnect', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    await protocol.push('StartConditionWaitTimer', { ...CONTENT, waitTime: 5 });
    await sdk.advance(4_000);
    await sdk.page.waitForTimeout(100);
    expect(protocol.messages('FireConditionWaitTimer')).toHaveLength(0);
    await sdk.advance(1_000);
    await protocol.waitForMessages('FireConditionWaitTimer', 1);
    expect(protocol.messages('FireConditionWaitTimer')[0].message.payload).toMatchObject({
      versionId: CONTENT.versionId,
    });

    protocol.dropTransport();
    await protocol.waitForDisconnect(protocol.connections[0]);
    await sdk.advance(3_000);
    await protocol.waitForConnections(2);
    expect(protocol.connections[1].auth.waitTimers).toEqual([
      expect.objectContaining({ versionId: CONTENT.versionId, waitTime: 5, activated: true }),
    ]);
  });

  test('a wait longer than five minutes is clamped to five minutes', async ({ sdk, protocol }) => {
    await sdk.init();
    await sdk.identify('u1');
    await protocol.push('StartConditionWaitTimer', { ...CONTENT, waitTime: 600 });
    await sdk.advance(299_000);
    await sdk.page.waitForTimeout(100);
    expect(protocol.messages('FireConditionWaitTimer')).toHaveLength(0);
    await sdk.advance(2_000);
    await protocol.waitForMessages('FireConditionWaitTimer', 1);
  });

  test('a cancelled timer never fires', async ({ sdk, protocol }) => {
    await sdk.init();
    await sdk.identify('u1');
    await protocol.push('StartConditionWaitTimer', { ...CONTENT, waitTime: 5 });
    await protocol.push('CancelConditionWaitTimer', { versionId: CONTENT.versionId });
    await sdk.advance(10_000);
    await sdk.page.waitForTimeout(200);
    expect(protocol.messages('FireConditionWaitTimer')).toHaveLength(0);
  });
});

test.describe('page URL', () => {
  test('a navigation is reported with the new page URL', async ({ sdk, protocol }) => {
    await sdk.init();
    await sdk.identify('u1');
    expect(protocol.connections[0].auth.clientContext).toMatchObject({
      pageUrl: expect.stringContaining('/runtime.html'),
    });

    await sdk.page.evaluate(() => history.pushState({}, '', '/runtime.html?step=2'));
    await sdk.advance(600);
    await protocol.waitForMessages('UpdateClientContext', 1);
    expect(protocol.messages('UpdateClientContext')[0].message.payload).toMatchObject({
      pageUrl: expect.stringContaining('/runtime.html?step=2'),
      viewportWidth: 1280,
    });

    await sdk.page.evaluate(() => {
      location.hash = '#billing';
    });
    await sdk.advance(600);
    await protocol.waitForMessages('UpdateClientContext', 2);
    expect(protocol.messages('UpdateClientContext')[1].message.payload).toMatchObject({
      pageUrl: expect.stringContaining('#billing'),
    });
  });
});

test.describe('trackers', () => {
  const tracker = (id: string, autoStartRules: unknown[], attributes: unknown[] = []) => ({
    id: `session-${id}`,
    content: { id, type: 'tracker' },
    version: { id: `${id}-version`, config: { enabledAutoStartRules: true, autoStartRules } },
    attributes,
  });

  test('a tracker whose page-URL rule matches reports once, and again after it stops matching', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    await protocol.push(
      'AddTracker',
      tracker('tracker-url', [
        {
          id: ruleId(),
          type: 'current-page',
          operators: 'and',
          data: { includes: ['*/runtime.html*'], excludes: [] },
        },
      ]),
    );
    await protocol.waitForMessages('TrackTrackerEvent', 1);
    expect(protocol.messages('TrackTrackerEvent')[0].message.payload).toEqual({
      contentId: 'tracker-url',
      versionId: 'tracker-url-version',
    });
    // Still matching on later polls: no second report.
    await sdk.advance(3_000);
    await sdk.page.waitForTimeout(100);
    expect(protocol.messages('TrackTrackerEvent')).toHaveLength(1);
  });

  test('a tracker with a user-attribute rule is evaluated against the session attributes', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    const attributes = [
      { id: 'attr-plan', codeName: 'plan', bizType: 1, dataType: 2, value: 'pro' },
    ];
    await protocol.push(
      'AddTracker',
      tracker(
        'tracker-attr',
        [
          {
            id: ruleId(),
            type: 'user-attr',
            operators: 'and',
            data: { attrId: 'attr-plan', logic: 'is', value: 'pro' },
          },
        ],
        attributes,
      ),
    );
    await protocol.waitForMessages('TrackTrackerEvent', 1);
    expect(protocol.messages('TrackTrackerEvent')[0].message.payload).toMatchObject({
      contentId: 'tracker-attr',
    });

    await protocol.push(
      'AddTracker',
      tracker(
        'tracker-other',
        [
          {
            id: ruleId(),
            type: 'user-attr',
            operators: 'and',
            data: { attrId: 'attr-plan', logic: 'is', value: 'enterprise' },
          },
        ],
        attributes,
      ),
    );
    await sdk.advance(2_000);
    await sdk.page.waitForTimeout(100);
    expect(protocol.messages('TrackTrackerEvent')).toHaveLength(1);
  });

  test('a tracker with an element rule reports when the element is clicked, and stops once removed', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    await protocol.push('AddTracker', tracker('tracker-click', [elementRule('#cta', 'clicked')]));
    await sdk.advance(1_000);
    await sdk.page.waitForTimeout(100);
    expect(protocol.messages('TrackTrackerEvent')).toHaveLength(0);

    await sdk.page.click('#cta');
    await sdk.advance(1_000);
    await protocol.waitForMessages('TrackTrackerEvent', 1);

    await protocol.push('RemoveTracker', { contentId: 'tracker-click' });
    await sdk.page.click('#cta');
    await sdk.advance(3_000);
    await sdk.page.waitForTimeout(100);
    expect(protocol.messages('TrackTrackerEvent')).toHaveLength(1);
  });
});
