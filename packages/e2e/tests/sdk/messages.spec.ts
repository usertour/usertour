import { twoStepFlow } from './content';
import { RUNTIME_HOST_URL, expect, test } from './fixtures';

/**
 * The message layer itself: how writes are framed in batches, what `track()`
 * sends, what an unknown server message does, and what the page says when
 * its UI cannot initialise.
 */
test.describe('message framing', () => {
  test('a write is framed in a batch; a second write within the window joins it', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1', { plan: 'pro' });
    // The batch closes 50ms after the last acknowledgement, on the page clock.
    await sdk.advance(50);
    await protocol.waitForMessages('EndBatch', 1);
    expect(protocol.seen.map((seen) => seen.message.kind)).toEqual([
      'BeginBatch',
      'UpsertUser',
      'EndBatch',
    ]);

    // Two writes back to back: one batch around both.
    const first = await sdk.begin('updateUser', { plan: 'team' });
    const second = await sdk.begin('updateUser', { seats: 3 });
    await sdk.settle(first);
    await sdk.settle(second);
    await sdk.advance(50);
    await protocol.waitForMessages('EndBatch', 2);
    expect(protocol.seen.slice(3).map((seen) => seen.message.kind)).toEqual([
      'BeginBatch',
      'UpsertUser',
      'UpsertUser',
      'EndBatch',
    ]);
  });

  test('every client message carries a request id', async ({ sdk, protocol }) => {
    await sdk.init();
    await sdk.identify('u1');
    for (const seen of protocol.seen) {
      expect(seen.message.requestId).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

test.describe('track()', () => {
  test('sends the event with its attributes, unbatched, and resolves on the acknowledgement', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    await sdk.advance(50);
    await protocol.waitForMessages('EndBatch', 1);
    const before = protocol.seen.length;

    const result = await sdk.call('track', 'clicked_upgrade', { plan: 'pro' });
    expect(result.ok).toBe(true);
    await protocol.waitForMessages('TrackEvent', 1);
    expect(protocol.messages('TrackEvent')[0].message.payload).toMatchObject({
      name: 'clicked_upgrade',
      attributes: { plan: 'pro' },
    });
    await sdk.advance(100);
    expect(protocol.seen.slice(before).map((seen) => seen.message.kind)).toEqual(['TrackEvent']);
  });

  test('is refused before identify()', async ({ sdk, protocol }) => {
    await sdk.init();
    const result = await sdk.call('track', 'too_early');
    expect(result.ok).toBe(false);
    expect(protocol.messages('TrackEvent')).toHaveLength(0);
  });
});

test.describe('server messages', () => {
  test('an unknown kind is acknowledged, ignored and logged', async ({ sdk, protocol }) => {
    await sdk.init();
    await sdk.identify('u1');
    const ack = await protocol.push('SetWeather', { sunny: true });
    expect(ack).toBe(true);
    await expect
      .poll(async () => (await sdk.logLines(/No handler for server message SetWeather/)).length)
      .toBe(1);
  });

  test('messages are handled in the order they arrive', async ({ sdk, protocol }) => {
    await sdk.init();
    await sdk.identify('u1');
    // Pushed back to back without waiting: the forced step must land on the
    // session set just before it.
    void protocol.push('SetFlowSession', twoStepFlow('session-1', 'flow-1'));
    void protocol.push('ForceGoToStep', { sessionId: 'session-1', stepId: 'flow-1-step-2' });
    await expect(sdk.frame().getByText('Click here to begin')).toBeVisible();
  });
});

test.describe('the UI failing to initialise', () => {
  test.use({ assetsUri: `${RUNTIME_HOST_URL}/nowhere` });

  test('is retried once a second and then reported as critical', async ({ sdk }) => {
    await sdk.init();
    await sdk.identify('u1');
    await expect
      .poll(
        async () => (await sdk.logLines(/UI initialization failed \(attempt 1\), retrying/)).length,
      )
      .toBe(1);
    // Sixty attempts, a second apart on the page clock.
    await sdk.advance(61_000);
    await expect
      .poll(async () => (await sdk.logLines(/UI initialization failed after 60 attempts/)).length, {
        timeout: 15_000,
      })
      .toBe(1);
    await expect(sdk.widget).toHaveCount(0);
  });
});
