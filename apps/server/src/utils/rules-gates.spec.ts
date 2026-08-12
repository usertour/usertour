import { ContentDataType, Frequency, FrequencyUnits } from '@usertour/types';

import {
  filterAvailableAutoStartContentVersions,
  isAllowedByAutoStartRulesSetting,
  isAllowedByConditionWaitTimers,
} from './content-utils';
import type { CustomContentVersion } from '@/common/types/content';

/**
 * The auto-start GATE SEQUENCE — the part of rule evaluation that is not the
 * condition tree.
 *
 * Whether content starts is decided in two halves: `isConditionsActived` scores
 * the condition tree (covered densely in @usertour/helpers), and then these
 * gates decide whether a version that MATCHES is actually allowed to run —
 * frequency, the cross-content quiet period, the wait timer, hide rules, and
 * the per-type ordering. Both halves had to pass for anything to show, and only
 * the first half had tests: `isAllowedByAutoStartRulesSetting` and
 * `filterAvailableAutoStartContentVersions` had NONE.
 *
 * That gap is not theoretical. The frequency-less case below (a stored version
 * with no `frequency` runs with NO limit, not as `once`) sat wrong in four
 * documentation surfaces because nothing asserted what the gate actually does.
 *
 * These are pure-function tests on purpose: the gates take a fully-formed
 * version + session snapshot, so the whole matrix is reachable without a
 * database, a socket, or a browser.
 */

const HOUR = 60 * 60 * 1000;

type SessionOverrides = Partial<CustomContentVersion['session']>;

/** A version whose conditions already matched — these tests are about the gates AFTER that. */
const version = (
  opts: {
    type?: ContentDataType;
    frequency?: unknown;
    startIfNotComplete?: boolean;
    wait?: number;
    priority?: string;
    hideRules?: unknown[];
    enabledHideRules?: boolean;
  } = {},
  session: SessionOverrides = {},
): CustomContentVersion =>
  ({
    id: opts.priority ? `v-${opts.priority}` : 'v1',
    contentId: 'c1',
    content: { id: 'c1', type: opts.type ?? ContentDataType.FLOW },
    config: {
      enabledAutoStartRules: true,
      autoStartRules: [{ type: 'current-page', actived: true, operators: 'and' }],
      enabledHideRules: opts.enabledHideRules ?? false,
      hideRules: opts.hideRules ?? [],
      autoStartRulesSetting: {
        ...(opts.frequency !== undefined ? { frequency: opts.frequency } : {}),
        ...(opts.startIfNotComplete !== undefined
          ? { startIfNotComplete: opts.startIfNotComplete }
          : {}),
        ...(opts.wait !== undefined ? { wait: opts.wait } : {}),
        ...(opts.priority !== undefined ? { priority: opts.priority } : {}),
      },
    },
    session: {
      totalSessions: 0,
      completedSessions: 0,
      ...session,
    },
  }) as unknown as CustomContentVersion;

const eventAt = (msAgo: number) => ({ createdAt: new Date(Date.now() - msAgo) }) as never;

describe('isAllowedByAutoStartRulesSetting — the frequency gate', () => {
  describe('no frequency stored', () => {
    // The load-bearing case. A version stored WITHOUT a frequency passes this
    // gate unconditionally — it does NOT fall back to `once`. Four doc surfaces
    // claimed otherwise; the runtime is deliberately left this way because
    // banner / launcher / resource-center have no frequency knob at all and
    // baking `once` in here would cap them at a single show for life.
    it('passes unconditionally, even after many prior sessions', () => {
      expect(isAllowedByAutoStartRulesSetting(version({}, { totalSessions: 0 }))).toBe(true);
      expect(isAllowedByAutoStartRulesSetting(version({}, { totalSessions: 1 }))).toBe(true);
      expect(isAllowedByAutoStartRulesSetting(version({}, { totalSessions: 99 }))).toBe(true);
    });

    it('is still gated by startIfNotComplete — the two are independent', () => {
      const v = version({ startIfNotComplete: true }, { completedSessions: 1 });
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });
  });

  describe('once', () => {
    const once = { frequency: Frequency.ONCE };

    it('allows the first show', () => {
      expect(isAllowedByAutoStartRulesSetting(version({ frequency: once }))).toBe(true);
    });

    it('blocks once ANY session exists — dismissed sessions count too', () => {
      expect(
        isAllowedByAutoStartRulesSetting(version({ frequency: once }, { totalSessions: 1 })),
      ).toBe(false);
    });

    it('counts total sessions, not completed ones', () => {
      // A user who started and abandoned has totalSessions 1, completed 0.
      const v = version({ frequency: once }, { totalSessions: 1, completedSessions: 0 });
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });
  });

  describe('multiple — a count cap AND a window, both must pass', () => {
    const multiple = (times: number, hours: number) => ({
      frequency: Frequency.MULTIPLE,
      every: { times, duration: hours, unit: FrequencyUnits.HOURS },
    });

    it('blocks once the session count reaches `times`', () => {
      const v = version(
        { frequency: multiple(2, 1) },
        { totalSessions: 2, latestDismissedEvent: eventAt(99 * HOUR) },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });

    it('the count cap is UNREACHABLE until a dismissal exists — an ordering coupling', () => {
      // `if (!latestDismissedEvent) return true` sits ABOVE the count check, so
      // the cap depends on an event that has nothing to do with counting. Not a
      // live defect: flow/checklist are singleton, so starting session N+1 ends
      // session N and emits FLOW_ENDED (a DISMISSED_EVENT), and the event query
      // that builds this field is unwindowed (findMany, no take) — by the time
      // totalSessions reaches the cap a dismissal always exists. Pinned because
      // the coupling is invisible at the call site: anything that later windows
      // that query, or a type that ends sessions without a DISMISSED_EVENT,
      // silently lifts the cap instead of failing loudly.
      const capped = version({ frequency: multiple(2, 1) }, { totalSessions: 2 });
      expect(isAllowedByAutoStartRulesSetting(capped)).toBe(true);
    });

    it('blocks while the window since the last dismissal has not elapsed', () => {
      const v = version(
        { frequency: multiple(5, 2) },
        { totalSessions: 1, latestDismissedEvent: eventAt(1 * HOUR) },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });

    it('allows once the window HAS elapsed and the count is under the cap', () => {
      const v = version(
        { frequency: multiple(5, 2) },
        { totalSessions: 1, latestDismissedEvent: eventAt(3 * HOUR) },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(true);
    });

    it('the count cap wins even when the window has elapsed', () => {
      const v = version(
        { frequency: multiple(2, 1) },
        { totalSessions: 2, latestDismissedEvent: eventAt(99 * HOUR) },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });

    it('with no dismissal yet the window cannot have elapsed — but it still allows', () => {
      // No latestDismissedEvent short-circuits to allow: nothing to measure the
      // window from. Worth pinning: it is why a never-dismissed multiple-mode
      // content can re-show before its window on the second start.
      const v = version({ frequency: multiple(5, 2) }, { totalSessions: 1 });
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(true);
    });
  });

  describe('unlimited — window only, no count cap', () => {
    const unlimited = (hours: number) => ({
      frequency: Frequency.UNLIMITED,
      every: { duration: hours, unit: FrequencyUnits.HOURS },
    });

    it('ignores the session count entirely', () => {
      const v = version(
        { frequency: unlimited(1) },
        { totalSessions: 500, latestDismissedEvent: eventAt(2 * HOUR) },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(true);
    });

    it('still enforces the re-show window', () => {
      const v = version(
        { frequency: unlimited(6) },
        { totalSessions: 1, latestDismissedEvent: eventAt(1 * HOUR) },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });
  });

  describe('atLeast — a cross-content quiet period, not a same-content gap', () => {
    // latestEvent is "the latest event from OTHER content of the SAME type"
    // (content-data.service builds it that way), so this window measures how
    // recently the user saw something ELSE, not this content.
    const withAtLeast = (hours: number) => ({
      frequency: Frequency.UNLIMITED,
      every: { duration: 0, unit: FrequencyUnits.HOURS },
      atLeast: { duration: hours, unit: FrequencyUnits.HOURS },
    });

    it('blocks while another same-type content showed inside the window', () => {
      const v = version({ frequency: withAtLeast(4) }, { latestEvent: eventAt(1 * HOUR) });
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });

    it('allows once the quiet period has passed', () => {
      const v = version({ frequency: withAtLeast(4) }, { latestEvent: eventAt(5 * HOUR) });
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(true);
    });

    it('is skipped entirely when no other content has ever shown', () => {
      const v = version({ frequency: withAtLeast(4) }, {});
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(true);
    });

    it('applies BEFORE the mode check — a quiet-period block beats a legal once', () => {
      const v = version(
        {
          frequency: {
            frequency: Frequency.ONCE,
            atLeast: { duration: 4, unit: FrequencyUnits.HOURS },
          },
        },
        { totalSessions: 0, latestEvent: eventAt(1 * HOUR) },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });
  });

  describe('startIfNotComplete', () => {
    it('blocks after a completion, whatever the frequency says', () => {
      const v = version(
        {
          frequency: {
            frequency: Frequency.UNLIMITED,
            every: { duration: 0, unit: FrequencyUnits.HOURS },
          },
          startIfNotComplete: true,
        },
        { completedSessions: 1 },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });

    it('does not block on abandoned sessions — only genuine completions', () => {
      const v = version(
        { frequency: { frequency: Frequency.ONCE }, startIfNotComplete: true },
        { totalSessions: 0, completedSessions: 0 },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(true);
    });

    it('is the FIRST gate — it precedes even the quiet period', () => {
      const v = version(
        {
          frequency: {
            frequency: Frequency.ONCE,
            atLeast: { duration: 4, unit: FrequencyUnits.HOURS },
          },
          startIfNotComplete: true,
        },
        { completedSessions: 1, latestEvent: eventAt(99 * HOUR) },
      );
      expect(isAllowedByAutoStartRulesSetting(v)).toBe(false);
    });
  });
});

describe('isAllowedByConditionWaitTimers — availability gate, not a countdown', () => {
  it('allows immediately when no wait is configured', () => {
    expect(isAllowedByConditionWaitTimers(version({}), [])).toBe(true);
  });

  it('blocks a configured wait until its timer has FIRED', () => {
    const v = version({ wait: 30 });
    expect(isAllowedByConditionWaitTimers(v, [])).toBe(false);
    expect(isAllowedByConditionWaitTimers(v, ['other-version'])).toBe(false);
    expect(isAllowedByConditionWaitTimers(v, [v.id])).toBe(true);
  });

  it('treats wait: 0 as no wait', () => {
    expect(isAllowedByConditionWaitTimers(version({ wait: 0 }), [])).toBe(true);
  });
});

describe('filterAvailableAutoStartContentVersions — the gates in sequence', () => {
  const run = (
    versions: CustomContentVersion[],
    type = ContentDataType.FLOW,
    waitTimers?: never[],
  ) => filterAvailableAutoStartContentVersions(versions, type, [], waitTimers).map((v) => v.id);

  it('drops versions of a different content type', () => {
    const flow = version({ type: ContentDataType.FLOW, frequency: { frequency: Frequency.ONCE } });
    const banner = version({
      type: ContentDataType.BANNER,
      frequency: { frequency: Frequency.ONCE },
    });
    banner.id = 'banner-1';
    expect(run([flow, banner])).toEqual(['v1']);
  });

  it('drops versions whose conditions are not active', () => {
    const v = version({ frequency: { frequency: Frequency.ONCE } });
    (v.config as { autoStartRules: unknown[] }).autoStartRules = [
      { type: 'current-page', actived: false, operators: 'and' },
    ];
    expect(run([v])).toEqual([]);
  });

  it('drops versions blocked by the frequency gate', () => {
    const v = version({ frequency: { frequency: Frequency.ONCE } }, { totalSessions: 1 });
    expect(run([v])).toEqual([]);
  });

  it('drops versions whose hide rules are active', () => {
    const v = version({
      frequency: { frequency: Frequency.ONCE },
      enabledHideRules: true,
      hideRules: [{ type: 'current-page', actived: true, operators: 'and' }],
    });
    expect(run([v])).toEqual([]);
  });

  it('keeps a version whose hide rules exist but are NOT active', () => {
    const v = version({
      frequency: { frequency: Frequency.ONCE },
      enabledHideRules: true,
      hideRules: [{ type: 'current-page', actived: false, operators: 'and' }],
    });
    expect(run([v])).toEqual(['v1']);
  });

  it('orders survivors by priority — and an unset priority ranks as medium', () => {
    const mk = (priority: string | undefined, id: string) => {
      const v = version({ frequency: { frequency: Frequency.ONCE }, priority });
      v.id = id;
      return v;
    };
    const out = run([mk('low', 'a-low'), mk('highest', 'b-highest'), mk(undefined, 'c-unset')]);
    expect(out).toEqual(['b-highest', 'c-unset', 'a-low']);
  });

  it('applies the wait-timer gate only when timers are supplied', () => {
    const v = version({ frequency: { frequency: Frequency.ONCE }, wait: 30 });
    // No timers argument at all → the wait gate is skipped entirely.
    expect(run([v])).toEqual(['v1']);
    // Supplied but this version's timer has not fired → dropped.
    expect(
      filterAvailableAutoStartContentVersions([v], ContentDataType.FLOW, [], [
        { versionId: 'someone-else', activated: true },
      ] as never).map((x) => x.id),
    ).toEqual([]);
    // Supplied and fired → kept.
    expect(
      filterAvailableAutoStartContentVersions([v], ContentDataType.FLOW, [], [
        { versionId: v.id, activated: true },
      ] as never).map((x) => x.id),
    ).toEqual(['v1']);
  });
});
