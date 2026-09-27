import {
  CLIENT_DISCONNECT_REASON,
  ConnectionState,
  isRetryableHandshakeError,
  keysStillOwnedBy,
  mergeFailedWrite,
  noteSentKeys,
  RECONNECT_MAX_DELAY_MS,
  reconnectDelayMs,
  recordFailedWrite,
  reduceConnection,
  type ReplayableWrite,
  retireWrittenKeys,
  SERVER_DISCONNECT_REASON,
  stripNonIdempotentWrites,
  withoutExpiredKeys,
  withoutWrittenKeys,
} from '../connection-recovery';

describe('reduceConnection', () => {
  const states: ConnectionState[] = ['idle', 'connecting', 'connected', 'reconnecting', 'rejected'];

  test('new credentials after a rejection reconnect when the set had connected before', () => {
    expect(reduceConnection('rejected', { type: 'connect_requested', hadConnected: true })).toEqual(
      { state: 'reconnecting', actions: [] },
    );
    expect(reduceConnection('reconnecting', { type: 'connect' })).toEqual({
      state: 'connected',
      actions: ['replay', 'evaluate'],
    });
    expect(
      reduceConnection('rejected', { type: 'connect_requested', hadConnected: false }),
    ).toEqual({ state: 'connecting', actions: [] });
  });

  test('connect_requested opens from idle and rejected only', () => {
    expect(reduceConnection('idle', { type: 'connect_requested' })).toEqual({
      state: 'connecting',
      actions: [],
    });
    expect(reduceConnection('rejected', { type: 'connect_requested' })).toEqual({
      state: 'connecting',
      actions: [],
    });
    for (const state of ['connecting', 'connected', 'reconnecting'] as ConnectionState[]) {
      expect(reduceConnection(state, { type: 'connect_requested' })).toEqual({
        state,
        actions: [],
      });
    }
  });

  test('the first connect replays but does not evaluate', () => {
    expect(reduceConnection('connecting', { type: 'connect' })).toEqual({
      state: 'connected',
      actions: ['replay'],
    });
  });

  test('a connect out of reconnecting replays and evaluates', () => {
    expect(reduceConnection('reconnecting', { type: 'connect' })).toEqual({
      state: 'connected',
      actions: ['replay', 'evaluate'],
    });
  });

  test('a repeated connect is inert', () => {
    expect(reduceConnection('connected', { type: 'connect' })).toEqual({
      state: 'connected',
      actions: [],
    });
  });

  test.each([
    ['our own disconnect', CLIENT_DISCONNECT_REASON, 'idle', []],
    ['a server disconnect', SERVER_DISCONNECT_REASON, 'reconnecting', ['schedule_reconnect']],
    ['a transport drop', 'transport close', 'reconnecting', []],
    ['a ping timeout', 'ping timeout', 'reconnecting', []],
  ])('%s', (_, reason, state, actions) => {
    expect(reduceConnection('connected', { type: 'disconnect', reason })).toEqual({
      state,
      actions,
    });
  });

  test('a non-retryable connect_error stops in rejected from any state', () => {
    for (const state of states) {
      expect(
        reduceConnection(state, { type: 'connect_error', retryable: false, active: false }),
      ).toEqual({ state: 'rejected', actions: ['stop'] });
    }
  });

  test('a retryable rejection schedules a manual reconnect when Socket.IO gave up', () => {
    expect(
      reduceConnection('reconnecting', { type: 'connect_error', retryable: true, active: false }),
    ).toEqual({ state: 'reconnecting', actions: ['schedule_reconnect'] });
    expect(
      reduceConnection('connecting', { type: 'connect_error', retryable: true, active: false }),
    ).toEqual({ state: 'connecting', actions: ['schedule_reconnect'] });
  });

  test('a transport-level connect_error is left to Socket.IO', () => {
    expect(
      reduceConnection('reconnecting', { type: 'connect_error', retryable: true, active: true }),
    ).toEqual({ state: 'reconnecting', actions: [] });
    expect(
      reduceConnection('connecting', { type: 'connect_error', retryable: true, active: true }),
    ).toEqual({ state: 'connecting', actions: [] });
  });

  test('a first connection that was rejected, then succeeds, still counts as first', () => {
    const afterError = reduceConnection('connecting', {
      type: 'connect_error',
      retryable: true,
      active: false,
    });
    expect(reduceConnection(afterError.state, { type: 'connect' }).actions).toEqual(['replay']);
  });
});

describe('reconnectDelayMs', () => {
  const noJitter = () => 0.5;

  test('doubles from 1 s and caps at 60 s', () => {
    expect([0, 1, 2, 3, 5, 6, 7, 20].map((attempt) => reconnectDelayMs(attempt, noJitter))).toEqual(
      [
        1000,
        2000,
        4000,
        8000,
        32000,
        RECONNECT_MAX_DELAY_MS,
        RECONNECT_MAX_DELAY_MS,
        RECONNECT_MAX_DELAY_MS,
      ],
    );
  });

  test('jitters within ±25 %', () => {
    expect(reconnectDelayMs(0, () => 0)).toBe(750);
    expect(reconnectDelayMs(0, () => 1)).toBe(1250);
  });

  test('tolerates a negative attempt', () => {
    expect(reconnectDelayMs(-3, noJitter)).toBe(1000);
  });
});

describe('isRetryableHandshakeError', () => {
  test.each([
    ['an explicit refusal', Object.assign(new Error('x'), { data: { retryable: false } }), false],
    ['an explicit retryable', Object.assign(new Error('x'), { data: { retryable: true } }), true],
    ['no data (older server)', new Error('x'), true],
    ['data without the flag', Object.assign(new Error('x'), { data: { code: 'E1' } }), true],
    ['not an error', 'boom', true],
  ])('%s', (_, error, expected) => {
    expect(isRetryableHandshakeError(error)).toBe(expected);
  });
});

describe('mergeFailedWrite', () => {
  test('keeps the older keys and lets the newer values win', () => {
    expect(
      mergeFailedWrite(
        { externalUserId: 'u', attributes: { plan: 'pro', seats: 3 } },
        { externalUserId: 'u', attributes: { seats: 4, last_seen: 'x' } },
      ),
    ).toEqual({ externalUserId: 'u', attributes: { plan: 'pro', seats: 4, last_seen: 'x' } });
  });

  test('merges membership separately and takes other fields from the newer write', () => {
    expect(
      mergeFailedWrite(
        {
          externalCompanyId: 'c',
          token: 'old',
          attributes: { name: 'A' },
          membership: { role: 'x' },
        },
        { externalCompanyId: 'c', token: 'new', membership: { seat: 1 } },
      ),
    ).toEqual({
      externalCompanyId: 'c',
      token: 'new',
      attributes: { name: 'A' },
      membership: { role: 'x', seat: 1 },
    });
  });

  test('returns the newer write when there was none before', () => {
    const next = { attributes: { a: 1 } };
    expect(mergeFailedWrite(undefined, next)).toBe(next);
  });
});

describe('withoutWrittenKeys', () => {
  test('drops the keys a later write landed and keeps the rest', () => {
    expect(
      withoutWrittenKeys(
        { attributes: { plan: 'pro', seats: 3 }, membership: { role: 'x' } },
        { attributes: { plan: 'free' } },
      ),
    ).toEqual({ attributes: { seats: 3 }, membership: { role: 'x' } });
  });

  test('is undefined once nothing is left to replay', () => {
    expect(
      withoutWrittenKeys({ attributes: { plan: 'pro' } }, { attributes: { plan: 'free' } }),
    ).toBeUndefined();
  });

  test('a write without attributes retires nothing', () => {
    const failed = { attributes: { plan: 'pro' } };
    expect(withoutWrittenKeys(failed, {})).toEqual(failed);
  });
});

describe('recordFailedWrite', () => {
  const MIN = 60_000;
  type Write = ReplayableWrite & { externalCompanyId?: string };

  test('an add that fails after a literal for the same key leaves the key out entirely', () => {
    const first = recordFailedWrite<Write>(
      undefined,
      { attributes: { count: 10, plan: 'pro' } },
      1000,
    );
    const second = recordFailedWrite<Write>(first, { attributes: { count: { add: 1 } } }, 2000);
    expect(second.write).toEqual({ attributes: { plan: 'pro' } });
    expect(second.stamps).toEqual({ attributes: { plan: 1000 }, membership: {} });
  });

  test('each key keeps the time it last failed; the replay count carries over', () => {
    const first = recordFailedWrite<Write>(undefined, { attributes: { plan: 'pro' } }, 1000);
    const resent = { ...first, replays: 1 };
    const second = recordFailedWrite<Write>(resent, { attributes: { last_seen: 'x' } }, 5000);
    expect(second.write).toEqual({ attributes: { plan: 'pro', last_seen: 'x' } });
    expect(second.stamps.attributes).toEqual({ plan: 1000, last_seen: 5000 });
    expect(second.replays).toBe(1);
    expect(second.failedAt).toBe(5000);
  });

  test('withoutExpiredKeys drops only the keys that failed too long ago', () => {
    const first = recordFailedWrite<Write>(undefined, { attributes: { plan: 'pro' } }, 0);
    const second = recordFailedWrite<Write>(first, { attributes: { last_seen: 'x' } }, 8 * MIN);
    const pruned = withoutExpiredKeys(second, 12 * MIN, 10 * MIN);
    expect(pruned?.write).toEqual({ attributes: { last_seen: 'x' } });
    expect(pruned?.stamps.attributes).toEqual({ last_seen: 8 * MIN });
  });

  test('a record without keys is kept while its failure is recent and dropped once it is old', () => {
    const bare = recordFailedWrite<Write>(undefined, { externalCompanyId: 'c' }, 0);
    expect(withoutExpiredKeys(bare, 5 * MIN, 10 * MIN)).toEqual(bare);
    expect(withoutExpiredKeys(bare, 11 * MIN, 10 * MIN)).toBeUndefined();
  });

  test('retireWrittenKeys drops the keys and their stamps, and the record once none is left', () => {
    const record = recordFailedWrite<Write>(
      undefined,
      { attributes: { plan: 'pro', seats: 3 }, membership: { role: 'x' } },
      1000,
    );
    const partial = retireWrittenKeys(record, { attributes: { plan: 'free' } });
    expect(partial?.write).toEqual({ attributes: { seats: 3 }, membership: { role: 'x' } });
    expect(partial?.stamps).toEqual({ attributes: { seats: 1000 }, membership: { role: 1000 } });
    expect(
      retireWrittenKeys(record, { attributes: { plan: 1, seats: 1 }, membership: { role: 1 } }),
    ).toBeUndefined();
  });
});

describe('keysStillOwnedBy', () => {
  test('a key belongs to its latest send', () => {
    let sent = noteSentKeys(undefined, { attributes: { plan: 'old', seats: 3 } }, 1);
    sent = noteSentKeys(sent, { attributes: { plan: 'new' } }, 2);
    expect(sent).toEqual({ attributes: { plan: 2, seats: 1 }, membership: {} });
    expect(keysStillOwnedBy({ attributes: { plan: 'old', seats: 3 } }, sent, 1)).toEqual({
      attributes: { seats: 3 },
    });
    expect(keysStillOwnedBy({ attributes: { plan: 'new' } }, sent, 2)).toEqual({
      attributes: { plan: 'new' },
    });
  });

  test('a send whose every key a later send took owns nothing', () => {
    let sent = noteSentKeys(undefined, { attributes: { plan: 'old' } }, 1);
    sent = noteSentKeys(sent, { attributes: { plan: 'new' } }, 2);
    expect(keysStillOwnedBy({ attributes: { plan: 'old' } }, sent, 1)).toBeUndefined();
  });

  test('a write that carried no keys is returned as it is', () => {
    const bare: ReplayableWrite & { externalCompanyId: string } = { externalCompanyId: 'c' };
    expect(keysStillOwnedBy(bare, noteSentKeys(undefined, bare, 1), 1)).toBe(bare);
  });

  test('membership keys are tracked apart from attributes', () => {
    let sent = noteSentKeys(undefined, { attributes: { a: 1 }, membership: { role: 'x' } }, 1);
    sent = noteSentKeys(sent, { membership: { role: 'y' } }, 2);
    expect(keysStillOwnedBy({ attributes: { a: 1 }, membership: { role: 'x' } }, sent, 1)).toEqual({
      attributes: { a: 1 },
      membership: {},
    });
  });
});

describe('stripNonIdempotentWrites', () => {
  test('drops add operations and keeps everything else', () => {
    expect(
      stripNonIdempotentWrites({
        plan: 'pro',
        count: { add: 1 },
        source: { set_once: 'x' },
        tags: { union: ['a'] },
        gone: null,
        other: { subtract: 1 },
      }),
    ).toEqual({
      plan: 'pro',
      source: { set_once: 'x' },
      tags: { union: ['a'] },
      gone: null,
      other: { subtract: 1 },
    });
  });

  test('returns the same object when nothing was dropped', () => {
    const input = { plan: 'pro' };
    expect(stripNonIdempotentWrites(input)).toBe(input);
    expect(stripNonIdempotentWrites(undefined)).toBeUndefined();
  });
});
