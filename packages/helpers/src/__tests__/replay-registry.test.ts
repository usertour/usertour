import { ReplayRegistry, type TargetedWrite } from '../replay-registry';

/**
 * The timing scenarios the replay registry exists for (ADR 0018 §4): the
 * original write, its replay and a newer write are all in flight at once,
 * and the question is which value may be resent and which must not. Each
 * scenario here was a review finding once.
 */
interface Write extends TargetedWrite {
  attributes?: Record<string, unknown>;
  membership?: Record<string, unknown>;
}

const MINUTE = 60_000;

const harness = () => {
  let clock = 0;
  const registry = new ReplayRegistry<Write>({ now: () => clock, ttlMs: 10 * MINUTE });
  return {
    registry,
    at: (ms: number) => {
      clock = ms;
    },
  };
};

const user = { externalUserId: 'u' };
const onA = { externalUserId: 'u', externalCompanyId: 'A' };
const onB = { externalUserId: 'u', externalCompanyId: 'B' };

const startSend = (registry: ReplayRegistry<Write>, target = user) => {
  const started = registry.startReplay('user', target, 'tok');
  if (started.kind !== 'send') {
    throw new Error(`expected a replay, got ${started.kind}`);
  }
  return started;
};

describe('ReplayRegistry — what is resent', () => {
  test('an identify that timed out and an updateUser that timed out replay together, newer values winning', () => {
    const { registry } = harness();
    const identify = registry.sent('user', { ...user, attributes: { plan: 'pro', seats: 3 } });
    const update = registry.sent('user', { ...user, attributes: { seats: 4, last_seen: 'x' } });
    registry.failed('user', identify, { ...user, attributes: { plan: 'pro', seats: 3 } }, user);
    registry.failed('user', update, { ...user, attributes: { seats: 4, last_seen: 'x' } }, user);
    const started = startSend(registry);
    expect(started.write).toEqual({
      ...user,
      token: 'tok',
      attributes: { plan: 'pro', seats: 4, last_seen: 'x' },
    });
  });

  test('a newer write sent while the older one waits: the older failure registers nothing for that key', () => {
    // Offline: updateUser({plan:'old'}) at 0 s, updateUser({plan:'new'}) at
    // 10 s, the old one times out at 30 s. On reconnect Socket.IO flushes
    // the buffered new write first; a replay of old would land after it.
    const { registry } = harness();
    const old = registry.sent('user', { ...user, attributes: { plan: 'old' } });
    registry.sent('user', { ...user, attributes: { plan: 'new' } });
    registry.failed('user', old, { ...user, attributes: { plan: 'old' } }, user);
    expect(registry.startReplay('user', user, 'tok')).toEqual({ kind: 'nothing' });
  });

  test('a newer write sent after the older one failed takes its keys out of the record', () => {
    const { registry } = harness();
    const old = registry.sent('user', { ...user, attributes: { plan: 'old', seats: 3 } });
    registry.failed('user', old, { ...user, attributes: { plan: 'old', seats: 3 } }, user);
    registry.sent('user', { ...user, attributes: { plan: 'new' } });
    expect(startSend(registry).write.attributes).toEqual({ seats: 3 });
  });

  test('an add that fails after a literal for the same key leaves the key out', () => {
    const { registry } = harness();
    const literal = registry.sent('user', { ...user, attributes: { count: 10 } });
    const add = registry.sent('user', { ...user, attributes: { count: { add: 1 } } });
    registry.failed('user', literal, { ...user, attributes: { count: 10 } }, user);
    registry.failed('user', add, { ...user, attributes: { count: { add: 1 } } }, user);
    expect(startSend(registry).write.attributes).toEqual({});
  });

  test('a group() carrying only an add is still resent, for the membership it creates', () => {
    const { registry } = harness();
    const write = { ...onB, attributes: { count: { add: 1 } } };
    const ticket = registry.sent('company', write);
    registry.failed('company', ticket, write, onB);
    const started = registry.startReplay('company', onB, 'tok');
    expect(started.kind).toBe('send');
    if (started.kind === 'send') {
      expect(started.write).toEqual({ ...onB, token: 'tok', attributes: {} });
    }
  });

  test('a key older than the window is not resent; a bare group() is, while recent', () => {
    const { registry, at } = harness();
    at(0);
    const early = registry.sent('user', { ...user, attributes: { plan: 'pro' } });
    registry.failed('user', early, { ...user, attributes: { plan: 'pro' } }, user);
    at(8 * MINUTE);
    const late = registry.sent('user', { ...user, attributes: { last_seen: 'x' } });
    registry.failed('user', late, { ...user, attributes: { last_seen: 'x' } }, user);
    at(12 * MINUTE);
    expect(startSend(registry).write.attributes).toEqual({ last_seen: 'x' });

    const bare = registry.sent('company', onA);
    registry.failed('company', bare, onA, onA);
    at(13 * MINUTE);
    expect(registry.startReplay('company', onA, 'tok').kind).toBe('send');
  });

  test('the replay carries the token of now', () => {
    const { registry } = harness();
    const ticket = registry.sent('user', { ...user, token: 'stale', attributes: { a: 1 } });
    registry.failed('user', ticket, { ...user, token: 'stale', attributes: { a: 1 } }, user);
    expect(startSend(registry).write.token).toBe('tok');
  });
});

describe('ReplayRegistry — who it is for', () => {
  test('a write of the previous user that fails after identify() switched users registers nothing', () => {
    const { registry } = harness();
    const stale = registry.sent('user', { externalUserId: 'a', attributes: { email: 'a@x' } });
    registry.reset(); // identify('b')
    registry.failed(
      'user',
      stale,
      { externalUserId: 'a', attributes: { email: 'a@x' } },
      {
        externalUserId: 'b',
      },
    );
    const b = registry.sent('user', { externalUserId: 'b', attributes: { plan: 'pro' } });
    registry.failed(
      'user',
      b,
      { externalUserId: 'b', attributes: { plan: 'pro' } },
      {
        externalUserId: 'b',
      },
    );
    expect(startSend(registry, { externalUserId: 'b' }).write).toEqual({
      externalUserId: 'b',
      token: 'tok',
      attributes: { plan: 'pro' },
    });
  });

  test('a write for the previous user is not merged even without a reset', () => {
    const { registry } = harness();
    const stale = registry.sent('user', { externalUserId: 'a', attributes: { email: 'a@x' } });
    registry.failed(
      'user',
      stale,
      { externalUserId: 'a', attributes: { email: 'a@x' } },
      {
        externalUserId: 'b',
      },
    );
    expect(registry.has('user')).toBe(false);
  });

  test('a group() that timed out and was rolled back is dropped instead of replayed', () => {
    const { registry } = harness();
    const toB = registry.sent('company', { ...onB, attributes: { name: 'B' } });
    registry.failed('company', toB, { ...onB, attributes: { name: 'B' } }, onB);
    // The core rolled back to A.
    expect(registry.startReplay('company', onA, 'tok')).toEqual({
      kind: 'refused',
      reason: 'the SDK is no longer on that company',
    });
    expect(registry.has('company')).toBe(false);
  });

  test("a write to another company owns nothing of this company's keys", () => {
    // Offline on A: updateGroup({plan:'enterprise'}); before it times out,
    // group('B', {plan:'basic'}); A's write times out; on reconnect B is
    // refused and the core rolls back to A. A's plan must still replay.
    const { registry } = harness();
    const onAWrite = { ...onA, attributes: { plan: 'enterprise' } };
    const aTicket = registry.sent('company', onAWrite);
    registry.sent('company', { ...onB, attributes: { plan: 'basic' } });
    registry.failed('company', aTicket, onAWrite, onA);
    const started = registry.startReplay('company', onA, 'tok');
    expect(started.kind).toBe('send');
    if (started.kind === 'send') {
      expect(started.write.attributes).toEqual({ plan: 'enterprise' });
    }
  });

  test('a replay answered after group() moved to another company is not folded in', () => {
    const { registry } = harness();
    const onAWrite = { ...onA, attributes: { plan: 'enterprise' } };
    const ticket = registry.sent('company', onAWrite);
    registry.failed('company', ticket, onAWrite, onA);
    const started = registry.startReplay('company', onA, 'tok');
    if (started.kind !== 'send') {
      throw new Error('expected a replay');
    }
    // group('B') while the replay is out.
    expect(registry.replayAnswered('company', started.ticket, started.write, onB)).toBe(false);
  });

  test('a replay answered after reset() is neither folded in nor bookkept', () => {
    const { registry } = harness();
    const write = { ...user, attributes: { plan: 'pro' } };
    const ticket = registry.sent('user', write);
    registry.failed('user', ticket, write, user);
    const started = startSend(registry);
    registry.reset();
    expect(registry.replayAnswered('user', started.ticket, started.write, user)).toBe(false);
    expect(registry.has('user')).toBe(false);
  });
});

describe('ReplayRegistry — replays and newer writes in flight together', () => {
  test('a replay counts as an attempt even when a newer write replaces the record meanwhile', () => {
    const { registry } = harness();
    const old = registry.sent('user', { ...user, attributes: { plan: 'old' } });
    registry.failed('user', old, { ...user, attributes: { plan: 'old' } }, user);
    startSend(registry); // first replay goes out
    // An unrelated write while the replay is out, then the replay gets no answer.
    registry.sent('user', { ...user, attributes: { last_seen: 'now' } });
    expect(registry.startReplay('user', user, 'tok')).toEqual({
      kind: 'refused',
      reason: 'it was already resent and the server did not answer',
    });
  });

  test('a replay that lands retires only the keys no newer write took over', () => {
    const { registry } = harness();
    const old = registry.sent('user', { ...user, attributes: { plan: 'old', seats: 3 } });
    registry.failed('user', old, { ...user, attributes: { plan: 'old', seats: 3 } }, user);
    const replay = startSend(registry);
    // While the replay is out, a newer plan is sent and fails too.
    const newer = registry.sent('user', { ...user, attributes: { plan: 'new' } });
    registry.failed('user', newer, { ...user, attributes: { plan: 'new' } }, user);
    expect(registry.replayAnswered('user', replay.ticket, replay.write, user)).toBe(true);
    // seats landed; plan is the newer write's and stays for the next connect.
    const next = registry.startReplay('user', user, 'tok');
    expect(next.kind).toBe('send');
    if (next.kind === 'send') {
      expect(next.write.attributes).toEqual({ plan: 'new' });
    }
  });

  test('a record replayed and answered is gone', () => {
    const { registry } = harness();
    const write = { ...user, attributes: { plan: 'pro' } };
    const ticket = registry.sent('user', write);
    registry.failed('user', ticket, write, user);
    const started = startSend(registry);
    registry.replayAnswered('user', started.ticket, started.write, user);
    expect(registry.startReplay('user', user, 'tok')).toEqual({ kind: 'nothing' });
  });
});
