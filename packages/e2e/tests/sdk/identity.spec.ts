import { EMIT_TIMEOUT_MS, expect, test } from './fixtures';
import { defaultAnswer } from './protocol-server';

/**
 * The identify / group write path as the server sees it: what goes out, what
 * the acknowledgement does to the local cache, and what the host is told.
 */
test.describe('identity and attribute writes', () => {
  test('init + identify handshakes with the environment token and upserts the user', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init('env-token');
    const result = await sdk.identify('u1', { plan: 'pro' });
    expect(result).toEqual({ ok: true, value: { rejected: [] } });

    expect(protocol.connections).toHaveLength(1);
    expect(protocol.connections[0].auth).toMatchObject({
      token: 'env-token',
      externalUserId: 'u1',
    });
    const upserts = protocol.messages('UpsertUser');
    expect(upserts).toHaveLength(1);
    expect(upserts[0].message.payload).toMatchObject({
      externalUserId: 'u1',
      attributes: { plan: 'pro' },
    });
  });

  test('a refused key is reported, warned about, and sent again on the next call', async ({
    sdk,
    protocol,
  }) => {
    protocol.answer = (message) =>
      message.kind === 'UpsertUser'
        ? { ok: true, rejected: [{ codeName: 'experiment', reason: 'system-generated attribute' }] }
        : true;
    await sdk.init();
    const first = await sdk.identify('u1', { experiment: 'B', plan: 'pro' });
    expect(first).toEqual({
      ok: true,
      value: { rejected: [{ codeName: 'experiment', reason: 'system-generated attribute' }] },
    });
    expect(await sdk.logLines(/Attribute "experiment" was not written/)).toHaveLength(1);

    // The refused key left the cache: the same value is sent, and refused, again.
    const second = await sdk.updateUser({ experiment: 'B' });
    expect(second.ok && second.value.rejected).toHaveLength(1);
    expect(protocol.messages('UpsertUser')).toHaveLength(2);
    expect(await sdk.logLines(/Attribute "experiment" was not written/)).toHaveLength(2);
  });

  test('a write the server never answered leaves the cache: writing the old value back is sent', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1', { theme: 'dark' });

    protocol.answer = () => 'silent';
    const light = await sdk.begin('updateUser', { theme: 'light' });
    await protocol.waitForMessages('UpsertUser', 2);
    await sdk.advance(EMIT_TIMEOUT_MS);
    expect((await sdk.settle(light)).ok).toBe(false);

    // The host writes the original value back. The cache still held it before
    // the fix, so the call was skipped as unchanged — and the failed `light`
    // would have been replayed over it on the next connect.
    protocol.answer = defaultAnswer;
    expect(await sdk.updateUser({ theme: 'dark' })).toEqual({ ok: true, value: { rejected: [] } });
    const upserts = protocol.messages('UpsertUser');
    expect(upserts).toHaveLength(3);
    expect(upserts[2].message.payload).toMatchObject({ attributes: { theme: 'dark' } });
  });

  test('a write that failed offline is replayed on reconnect; its refused keys are reported and not cached', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    await protocol.goOffline();
    await protocol.waitForDisconnect(protocol.connections[0]);

    const offline = await sdk.begin('updateUser', { experiment: 'B', plan: 'team' });
    await sdk.advance(EMIT_TIMEOUT_MS);
    expect((await sdk.settle(offline)).ok).toBe(false);

    protocol.answer = (message) =>
      message.kind === 'UpsertUser'
        ? { ok: true, rejected: [{ codeName: 'experiment', reason: 'system-generated attribute' }] }
        : true;
    await protocol.goOnline();
    await sdk.advance(3_000);
    await protocol.waitForMessages('UpsertUser', 2);
    expect(protocol.messages('UpsertUser')[1].message.payload).toMatchObject({
      externalUserId: 'u1',
      attributes: { experiment: 'B', plan: 'team' },
    });
    await expect
      .poll(async () => (await sdk.logLines(/Attribute "experiment" was not written/)).length)
      .toBe(1);

    // `plan` landed and is cached; `experiment` was refused and is not.
    expect(await sdk.updateUser({ plan: 'team' })).toEqual({ ok: true, value: { rejected: [] } });
    expect(protocol.messages('UpsertUser')).toHaveLength(2);
    await sdk.updateUser({ experiment: 'B' });
    expect(protocol.messages('UpsertUser')).toHaveLength(3);
  });

  test('a write the server answered false is not replayed', async ({ sdk, protocol }) => {
    await sdk.init();
    await sdk.identify('u1');
    protocol.answer = (message) => message.kind !== 'UpsertUser';
    expect((await sdk.updateUser({ plan: 'team' })).ok).toBe(false);

    protocol.answer = defaultAnswer;
    await protocol.goOffline();
    await protocol.waitForDisconnect(protocol.connections[0]);
    await protocol.goOnline();
    await sdk.advance(3_000);
    await protocol.waitForConnections(2);
    await protocol.waitForMessages('EndBatch', 1);
    expect(protocol.messages('UpsertUser')).toHaveLength(2);
  });

  test('an unchanged write is not sent; a changed one is', async ({ sdk, protocol }) => {
    await sdk.init();
    await sdk.identify('u1', { plan: 'pro' });
    expect(await sdk.updateUser({ plan: 'pro' })).toEqual({ ok: true, value: { rejected: [] } });
    expect(protocol.messages('UpsertUser')).toHaveLength(1);
    await sdk.updateUser({ plan: 'team' });
    expect(protocol.messages('UpsertUser')).toHaveLength(2);
    expect(protocol.messages('UpsertUser')[1].message.payload).toMatchObject({
      attributes: { plan: 'team' },
    });
  });
});

test.describe('company writes', () => {
  test('a company write that failed offline is not replayed after the page moved to another company', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    expect((await sdk.group('X')).ok).toBe(true);
    await protocol.goOffline();
    await protocol.waitForDisconnect(protocol.connections[0]);

    const stale = await sdk.begin('updateGroup', { plan: 'b' });
    await sdk.advance(EMIT_TIMEOUT_MS);
    expect((await sdk.settle(stale)).ok).toBe(false);
    // Still offline: buffered by Socket.IO, it goes out before `connect` fires.
    const moved = await sdk.begin('group', 'Y', { size: 5 });

    await protocol.goOnline();
    await sdk.advance(3_000);
    await protocol.waitForMessages('UpsertCompany', 2);
    expect((await sdk.settle(moved)).ok).toBe(true);
    await sdk.page.waitForTimeout(300);
    const companies = protocol.messages('UpsertCompany').map((seen) => seen.message.payload);
    expect(companies[1]).toMatchObject({ externalCompanyId: 'Y', attributes: { size: 5 } });
    // X's failed write belongs to a company the page has left: never resent.
    expect(companies.slice(1).every((payload) => payload?.externalCompanyId === 'Y')).toBe(true);
  });

  test('two group() calls in flight: the earlier company’s answer does not land in the later one’s cache', async ({
    sdk,
    protocol,
  }) => {
    await sdk.init();
    await sdk.identify('u1');
    protocol.answer = async (message) => {
      if (message.kind === 'UpsertCompany' && message.payload?.externalCompanyId === 'X') {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      return defaultAnswer(message, undefined as never);
    };
    const toX = await sdk.begin('group', 'X', { seats: 10 });
    const toY = await sdk.begin('group', 'Y', { plan: 'free' });
    expect((await sdk.settle(toY)).ok).toBe(true);
    expect((await sdk.settle(toX)).ok).toBe(true);

    // Y never had `seats`: the write must go out.
    protocol.answer = defaultAnswer;
    expect((await sdk.updateGroup({ seats: 10 })).ok).toBe(true);
    const companies = protocol.messages('UpsertCompany');
    expect(companies).toHaveLength(3);
    expect(companies[2].message.payload).toMatchObject({
      externalCompanyId: 'Y',
      attributes: { seats: 10 },
    });
  });
});
