import { sanitizeClientConditions, sanitizeWaitTimers } from './websocket.util';

describe('handshake guards', () => {
  const timer = { contentId: 'c1', contentType: 'flow', versionId: 'v1', waitTime: 5 };
  const condition = { contentId: 'c1', contentType: 'flow', versionId: 'v1', conditionId: 'r1' };

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
