import { buildEventTopic, isValidSubscription, matchesSubscription } from './webhook-topics';

describe('buildEventTopic', () => {
  it('prefixes the codeName with the event namespace', () => {
    expect(buildEventTopic('flow_started')).toBe('event.tracked.flow_started');
  });
});

describe('matchesSubscription', () => {
  it('matches an exact topic subscription', () => {
    expect(matchesSubscription(['event.tracked.flow_started'], 'flow_started')).toBe(true);
    expect(matchesSubscription(['event.tracked.flow_started'], 'flow_completed')).toBe(false);
  });

  it('matches any behavior event via the wildcard and namespace subscriptions', () => {
    expect(matchesSubscription(['*'], 'flow_started')).toBe(true);
    expect(matchesSubscription(['event.tracked'], 'checklist_completed')).toBe(true);
  });

  it('excludes noisy events from wildcard and namespace subscriptions', () => {
    expect(matchesSubscription(['*'], 'page_viewed')).toBe(false);
    expect(matchesSubscription(['event.tracked'], 'page_viewed')).toBe(false);
  });

  it('delivers noisy events only on an explicit topic subscription', () => {
    expect(matchesSubscription(['event.tracked.page_viewed'], 'page_viewed')).toBe(true);
  });

  it('never segment-prefix matches: dotted codeNames require the full topic', () => {
    expect(matchesSubscription(['event.tracked.my'], 'my.custom.event')).toBe(false);
    expect(matchesSubscription(['event.tracked.my.custom.event'], 'my.custom.event')).toBe(true);
  });

  it('returns false for an empty subscription list', () => {
    expect(matchesSubscription([], 'flow_started')).toBe(false);
  });
});

describe('isValidSubscription', () => {
  it('accepts the wildcard, the namespace, and explicit topics', () => {
    expect(isValidSubscription('*')).toBe(true);
    expect(isValidSubscription('event.tracked')).toBe(true);
    expect(isValidSubscription('event.tracked.flow_started')).toBe(true);
    expect(isValidSubscription('event.tracked.my.custom.event')).toBe(true);
  });

  it('rejects unknown namespaces, bare codeNames, and empty parameters', () => {
    expect(isValidSubscription('flow_started')).toBe(false);
    expect(isValidSubscription('user.updated')).toBe(false);
    expect(isValidSubscription('event.tracked.')).toBe(false);
    expect(isValidSubscription('')).toBe(false);
  });
});
