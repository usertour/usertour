import {
  CLIENT_DISCONNECT_REASON,
  ConnectionState,
  RECONNECT_MAX_DELAY_MS,
  SERVER_DISCONNECT_REASON,
  isRetryableHandshakeError,
  reconnectDelayMs,
  reduceConnection,
  stripNonIdempotentWrites,
} from '../connection-recovery';

describe('reduceConnection', () => {
  const states: ConnectionState[] = ['idle', 'connecting', 'connected', 'reconnecting', 'rejected'];

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
