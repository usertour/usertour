import { expect, test } from './fixtures';

/**
 * The loader snippet a customer pastes into their page (the one the install
 * page hands out). It puts a stub on `window.usertour` that loads the bundle
 * on the first call and queues every call until the bundle is there; the
 * bundle then takes over the stub and replays the queue.
 */

test.use({ loader: 'snippet' });

test('calls made before the bundle loads are replayed in order, and their promises settle', async ({
  sdk,
  protocol,
  page,
}) => {
  const early = await page.evaluate(() => {
    const usertour = window.usertour as NonNullable<typeof window.usertour>;
    const settle = (name: string, call: unknown) => {
      (call as Promise<unknown>).then(
        (value) => {
          window.__usertourCalls[name] = { ok: true, value };
        },
        (error) => {
          window.__usertourCalls[name] = { ok: false, error: String(error?.message ?? error) };
        },
      );
    };
    usertour.init('env-token');
    settle('identify', usertour.identify('u1', { plan: 'pro' }));
    settle('track', usertour.track('signed_up'));
    // Resolves with whether the server started it, like a call made after the bundle loaded.
    settle('start', usertour.start('flow-9'));
    return { stubbed: usertour._stubbed, identified: usertour.isIdentified() };
  });
  expect(early).toEqual({ stubbed: true, identified: false });

  await sdk.waitForBundle();
  expect(await sdk.settle('identify')).toEqual({ ok: true, value: { rejected: [] } });
  expect(await sdk.settle('track')).toEqual({ ok: true, value: undefined });
  expect(await sdk.settle('start')).toEqual({ ok: true, value: true });

  expect(protocol.connections[0].auth).toMatchObject({
    token: 'env-token',
    externalUserId: 'u1',
  });
  expect(protocol.messages('UpsertUser')[0].message.payload).toMatchObject({
    externalUserId: 'u1',
    attributes: { plan: 'pro' },
  });
  expect(protocol.messages('TrackEvent')[0].message.payload).toMatchObject({ name: 'signed_up' });
  expect(protocol.messages('StartContent')[0].message.payload).toMatchObject({
    contentId: 'flow-9',
    startReason: 'start_from_program',
  });
  expect(await page.evaluate(() => window.usertour?.isIdentified())).toBe(true);
});

test('a method the bundle no longer has warns and resolves instead of hanging the page', async ({
  sdk,
  page,
}) => {
  await page.evaluate(() => {
    const usertour = window.usertour as NonNullable<typeof window.usertour>;
    const queue = window.USERTOURJS_QUEUE as unknown[];
    // An older loader queued every method it knew, including ones since
    // removed: the stub keeps its own reference to the queue.
    usertour.setScrollPadding = (...args: unknown[]) => {
      usertour.load();
      queue.push(['setScrollPadding', null, args]);
    };
    usertour.setScrollPadding(24);
    usertour.init('env-token');
  });
  await sdk.waitForBundle();
  expect(await sdk.logLines(/setScrollPadding\(\) is not supported/)).toHaveLength(1);

  // The current loader's stub for a removed method, called once the bundle is in.
  const later = await page.evaluate(async () => {
    await window.usertour?.setServerEndpoint('https://old.example');
    return 'resolved';
  });
  expect(later).toBe('resolved');
  expect(await sdk.logLines(/setServerEndpoint\(\) is not supported/)).toHaveLength(1);
});
