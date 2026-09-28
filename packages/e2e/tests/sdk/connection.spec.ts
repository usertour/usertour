import { expect, test } from './fixtures';

/**
 * The connection's lifecycle as the server sees it (ADR 0018): what a refusal,
 * a kick, a network drop, a reset and an identity change do to the handshakes
 * the server receives and to the messages that follow them. Each scenario was
 * a review finding once.
 */
test.describe('connection lifecycle', () => {
  test('a transport drop reconnects by itself and asks for one evaluation', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    const first = protocol.connections[0];

    protocol.dropTransport();
    await protocol.waitForDisconnect(first);
    // Socket.IO's own reconnection, after its backoff on the page clock.
    await sdk.advance(2_000);
    await protocol.waitForConnections(2);
    expect(protocol.connections[1].auth).toMatchObject({ externalUserId: 'u1' });
    // Nothing failed while offline, so the reconnect asks for an evaluation.
    await protocol.waitForMessages('EndBatch', 1);
    expect(await sdk.logLines(/Reconnected/)).toHaveLength(1);
  });

  const refuseExpired = (auth: Record<string, unknown>) =>
    auth.identityToken === 'expired'
      ? ({ accept: false, code: 'E1018', retryable: false } as const)
      : ({ accept: true } as const);

  test('a refused handshake is critical once, and a fresh identity token starts a new one right away', async ({
    sdk,
    protocol,
  }) => {
    protocol.handshake = refuseExpired;
    await sdk.init();

    await sdk.begin('identify', 'u1', {}, { token: 'expired' });
    await protocol.waitFor(() => protocol.attempts.length === 1, 'the refused handshake');
    expect(protocol.attempts[0].verdict).toMatchObject({ accept: false });
    await expect
      .poll(async () => (await sdk.logLines(/Connection rejected by the server \(E1018\)/)).length)
      .toBe(1);

    // The host obtained a valid token within the 30 seconds the first
    // identify() is still waiting: the same user, another identity token.
    const fresh = await sdk.begin('identify', 'u1', {}, { token: 'fresh' });
    await expect.poll(() => protocol.connections.length).toBe(1);
    expect(protocol.connections[0].auth).toMatchObject({
      externalUserId: 'u1',
      identityToken: 'fresh',
    });
    expect((await sdk.settle(fresh)).ok).toBe(true);
    expect(await sdk.logLines(/Connection rejected by the server/)).toHaveLength(1);
  });

  test('a refused handshake, then reset(), then identify() with a fresh token still connects', async ({
    sdk,
    protocol,
  }) => {
    protocol.handshake = refuseExpired;
    await sdk.init();
    await sdk.begin('identify', 'u1', {}, { token: 'expired' });
    await protocol.waitFor(() => protocol.attempts.length === 1, 'the refused handshake');

    // reset() clears every timer the page holds; the socket must not be left
    // "connecting" forever because of it.
    await sdk.reset();
    const fresh = await sdk.begin('identify', 'u1', {}, { token: 'fresh' });
    await expect.poll(() => protocol.connections.length).toBe(1);
    expect(protocol.connections[0].auth).toMatchObject({ identityToken: 'fresh' });
    expect((await sdk.settle(fresh)).ok).toBe(true);
  });

  test('a refusal of credentials replaced while the handshake was in flight is retried, not critical', async ({
    sdk,
    protocol,
  }) => {
    protocol.handshake = async (auth) => {
      if (auth.identityToken === 'stale') {
        // The server takes its time; the host replaces the token meanwhile.
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { accept: false, code: 'E1018', retryable: false };
      }
      return { accept: true };
    };
    await sdk.init();
    await sdk.begin('identify', 'u1', {}, { token: 'stale' });
    await sdk.page.waitForTimeout(100);
    const fresh = await sdk.begin('identify', 'u1', {}, { token: 'fresh' });

    await expect.poll(() => protocol.connections.length).toBe(1);
    expect(protocol.attempts.map((attempt) => attempt.verdict.accept)).toEqual([false, true]);
    expect(protocol.connections[0].auth).toMatchObject({ identityToken: 'fresh' });
    expect((await sdk.settle(fresh)).ok).toBe(true);
    expect(await sdk.logLines(/Connection rejected by the server/)).toHaveLength(0);
  });

  test('after a kick, a host call during the backoff does not open a second socket', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    const first = protocol.connections[0];

    protocol.kick(first);
    await protocol.waitForDisconnect(first);
    // A slow handshake keeps the host's connect attempt in flight while the
    // manual reconnect timer fires into it.
    protocol.handshake = async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return { accept: true };
    };
    const again = await sdk.begin('identify', 'u1', { plan: 'pro' });
    // The transport is open by now; the namespace handshake is still pending.
    await sdk.page.waitForTimeout(150);
    await sdk.advance(5_000);
    await protocol.waitForConnections(2);
    expect((await sdk.settle(again)).ok).toBe(true);
    await sdk.page.waitForTimeout(500);
    expect(protocol.connections).toHaveLength(2);
    expect(protocol.live()).toHaveLength(1);
  });

  test('reset() ends the connection: a later network blip does not reconnect as the user who left', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    await sdk.reset();

    await expect.poll(() => protocol.live().length).toBe(0);
    // A blip on whatever is still open, then time for any reconnection.
    protocol.dropTransport();
    await sdk.advance(5_000);
    await sdk.page.waitForTimeout(300);
    expect(protocol.connections.filter((c) => c.auth.externalUserId === 'u1')).toHaveLength(1);
    expect(protocol.messages('EndBatch')).toHaveLength(0);
  });

  test('a message buffered while offline is not sent on the next identity’s connection', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    await protocol.goOffline();
    await protocol.waitForDisconnect(protocol.connections[0]);

    // Buffered by Socket.IO for the next connection.
    await sdk.begin('track', 'clicked');
    // The page switches user; the buffered event belonged to the previous one.
    const next = await sdk.begin('identify', 'u2');
    await protocol.goOnline();
    await sdk.advance(3_000);
    await protocol.waitFor(
      () => protocol.connections.some((c) => c.auth.externalUserId === 'u2'),
      'the connection of u2',
    );
    expect((await sdk.settle(next)).ok).toBe(true);
    await sdk.page.waitForTimeout(300);
    expect(protocol.messages('TrackEvent')).toHaveLength(0);
  });
});
