import { sanitizeClientConditions, sanitizeSdkVersion, sanitizeWaitTimers } from './websocket.util';

describe('handshake guards', () => {
  const timer = { contentId: 'c1', contentType: 'flow', versionId: 'v1', waitTime: 5 };
  const condition = { contentId: 'c1', contentType: 'flow', versionId: 'v1', conditionId: 'r1' };

  it('keeps a short version string as the SDK version and nothing else', () => {
    expect(sanitizeSdkVersion('0.8.1')).toBe('0.8.1');
    expect(sanitizeSdkVersion(' 0.8.1-beta.2+build.7 ')).toBe('0.8.1-beta.2+build.7');
    expect(sanitizeSdkVersion(undefined)).toBeUndefined();
    expect(sanitizeSdkVersion(81)).toBeUndefined();
    expect(sanitizeSdkVersion('')).toBeUndefined();
    expect(sanitizeSdkVersion('0.8.1 <script>')).toBeUndefined();
    expect(sanitizeSdkVersion('9'.repeat(33))).toBeUndefined();
  });

  it('keeps well-formed wait timers and drops the rest', () => {
    expect(
      sanitizeWaitTimers([
        timer,
        { ...timer, activated: true },
        null,
        'x',
        { ...timer, waitTime: 'soon' },
        { ...timer, waitTime: -1 },
        { ...timer, versionId: 7 },
        { ...timer, activated: 'yes' },
      ]),
    ).toEqual([timer, { ...timer, activated: true }]);
    expect(sanitizeWaitTimers(undefined)).toEqual([]);
    expect(sanitizeWaitTimers({ versionId: 'v1' })).toEqual([]);
  });

  it('keeps well-formed client conditions and drops the rest', () => {
    expect(
      sanitizeClientConditions([
        condition,
        { ...condition, isActive: false },
        null,
        { ...condition, conditionId: undefined },
        { ...condition, isActive: 1 },
      ]),
    ).toEqual([condition, { ...condition, isActive: false }]);
    expect(sanitizeClientConditions('r1')).toEqual([]);
  });
});
